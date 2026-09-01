import Anthropic from "@anthropic-ai/sdk";
import { getSessionAddress } from "@/lib/server/auth";
import {
  CHAT_MODEL,
  MCP_CLIENT_BETA,
  buildSystemPrompt,
  buildTools,
  getAnthropicClient,
  getMcpServers,
  isChatConfigured,
  runCustomTool,
} from "@/lib/server/chat";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  type ChatAttachment,
  type ChatContext,
  type ChatMessage,
  type ChatStreamEvent,
} from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MESSAGES = 30;
const MAX_TEXT_LENGTH = 4000;

function isAttachment(value: unknown): value is ChatAttachment {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.name === "string" &&
    typeof a.mediaType === "string" &&
    typeof a.dataBase64 === "string"
  );
}

function isMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    (m.role === "user" || m.role === "assistant") &&
    typeof m.text === "string" &&
    (m.attachments === undefined ||
      (Array.isArray(m.attachments) && m.attachments.every(isAttachment)))
  );
}

function isContext(value: unknown): value is ChatContext {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    (c.address === null || typeof c.address === "string") &&
    typeof c.walletUsd === "number" &&
    typeof c.defiUsd === "number" &&
    typeof c.totalUsd === "number" &&
    Array.isArray(c.holdings)
  );
}

function attachmentToBlock(
  attachment: ChatAttachment,
): Anthropic.Beta.BetaContentBlockParam | null {
  const bytes = Math.ceil((attachment.dataBase64.length * 3) / 4);
  if (bytes > MAX_ATTACHMENT_BYTES) return null;

  if (attachment.mediaType.startsWith("image/")) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: attachment.mediaType as "image/png",
        data: attachment.dataBase64,
      },
    };
  }
  if (attachment.mediaType === "application/pdf") {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: attachment.dataBase64,
      },
    };
  }
  if (attachment.mediaType.startsWith("text/")) {
    const text = Buffer.from(attachment.dataBase64, "base64").toString("utf-8");
    return { type: "text", text: `File "${attachment.name}":\n${text.slice(0, 20_000)}` };
  }
  return null;
}

function toRequestMessages(messages: ChatMessage[]): Anthropic.Beta.BetaMessageParam[] {
  return messages.map((message) => {
    const attachmentBlocks = (message.attachments ?? [])
      .map(attachmentToBlock)
      .filter((b): b is Anthropic.Beta.BetaContentBlockParam => b !== null);

    if (attachmentBlocks.length === 0) {
      return { role: message.role, content: message.text };
    }
    return {
      role: message.role,
      content: [...attachmentBlocks, { type: "text", text: message.text }],
    };
  });
}

function sseEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(request: Request) {
  if (!isChatConfigured()) {
    return new Response(JSON.stringify({ error: "AI chat is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { messages, context } = (body ?? {}) as {
    messages?: unknown;
    context?: unknown;
  };

  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isMessage)) {
    return new Response(JSON.stringify({ error: "Invalid messages payload" }), {
      status: 400,
    });
  }
  if (!isContext(context)) {
    return new Response(JSON.stringify({ error: "Invalid context payload" }), {
      status: 400,
    });
  }

  const trimmed = messages.slice(-MAX_MESSAGES);
  const last = trimmed[trimmed.length - 1];
  if (last.role !== "user" || last.text.length > MAX_TEXT_LENGTH) {
    return new Response(JSON.stringify({ error: "Invalid final message" }), { status: 400 });
  }
  if ((last.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
    return new Response(JSON.stringify({ error: "Too many attachments" }), { status: 400 });
  }

  // The client tells us which wallet it's showing, but only trust it for
  // tools that touch stored data once it's backed by a verified session —
  // otherwise one wallet could read another's positions/alerts by lying here.
  const sessionAddress = await getSessionAddress();
  const scopedContext: ChatContext = {
    ...context,
    address: sessionAddress ?? context.address,
  };

  const anthropic = getAnthropicClient();
  const requestMessages = toRequestMessages(trimmed);
  const tools = buildTools();
  const mcpServers = getMcpServers();
  const system = buildSystemPrompt(scopedContext);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let workingMessages = requestMessages;

        // Manual agentic loop: resolve our custom tool calls ourselves;
        // CoinGecko MCP tool calls are executed server-side by Anthropic and
        // arrive already resolved, so most turns finish in one iteration.
        for (let iteration = 0; iteration < 6; iteration++) {
          const messageStream = anthropic.beta.messages.stream({
            model: CHAT_MODEL,
            max_tokens: 4096,
            betas: [MCP_CLIENT_BETA],
            system,
            tools,
            mcp_servers: mcpServers,
            messages: workingMessages,
          });

          messageStream.on("text", (text) => {
            controller.enqueue(sseEvent({ type: "text", text }));
          });
          messageStream.on("streamEvent", (event) => {
            if (
              event.type === "content_block_start" &&
              (event.content_block.type === "tool_use" ||
                event.content_block.type === "mcp_tool_use")
            ) {
              controller.enqueue(
                sseEvent({ type: "tool", name: event.content_block.name }),
              );
            }
          });

          const final = await messageStream.finalMessage();

          if (final.stop_reason === "pause_turn") {
            workingMessages = [...workingMessages, { role: "assistant", content: final.content }];
            continue;
          }

          if (final.stop_reason !== "tool_use") break;

          const toolUseBlocks = final.content.filter(
            (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use",
          );
          if (toolUseBlocks.length === 0) break;

          const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const block of toolUseBlocks) {
            const result = await runCustomTool(
              block.name,
              (block.input as Record<string, unknown>) ?? {},
              scopedContext.address,
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result.content,
              is_error: result.isError,
            });
          }

          workingMessages = [
            ...workingMessages,
            { role: "assistant", content: final.content },
            { role: "user", content: toolResults },
          ];
        }

        controller.enqueue(sseEvent({ type: "done" }));
      } catch (error) {
        controller.enqueue(
          sseEvent({
            type: "error",
            message: error instanceof Error ? error.message : "Chat request failed",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
