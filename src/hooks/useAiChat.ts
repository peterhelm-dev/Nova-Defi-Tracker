"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatAttachment, ChatContext, ChatMessage, ChatStreamEvent } from "@/lib/chat";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from "@/lib/chat";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fileToAttachment(file: File): Promise<ChatAttachment> {
  const buffer = await file.arrayBuffer();
  return {
    name: file.name,
    mediaType: file.type || "application/octet-stream",
    dataBase64: arrayBufferToBase64(buffer),
  };
}

/**
 * Drives the AI chat: keeps message history, streams the assistant's reply
 * from POST /api/chat over SSE, and turns picked files into base64
 * attachments. History is kept client-side and resent each turn (the API is
 * stateless); attachments are dropped from older messages before resending so
 * payloads don't keep growing.
 */
export function useAiChat(context: ChatContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolName, setToolName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string, files: File[]) => {
      const trimmedText = text.trim();
      if (!trimmedText && files.length === 0) return;
      if (files.length > MAX_ATTACHMENTS) {
        setError(`Attach at most ${MAX_ATTACHMENTS} files`);
        return;
      }
      const oversized = files.find((f) => f.size > MAX_ATTACHMENT_BYTES);
      if (oversized) {
        setError(`${oversized.name} is too large (max 8MB)`);
        return;
      }

      setError(null);
      const attachments = await Promise.all(files.map(fileToAttachment));
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmedText,
        attachments,
      };
      const assistantId = crypto.randomUUID();

      const history = [
        ...messages.map((m) => ({ ...m, attachments: undefined })),
        userMessage,
      ];
      setMessages([...history, { id: assistantId, role: "assistant", text: "" }]);
      setIsStreaming(true);
      setToolName(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          signal: controller.signal,
          body: JSON.stringify({ messages: history, context }),
        });

        if (!res.ok || !res.body) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? "Chat request failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const event = JSON.parse(line.slice("data: ".length)) as ChatStreamEvent;

            if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: m.text + event.text } : m,
                ),
              );
            } else if (event.type === "tool") {
              setToolName(event.name);
            } else if (event.type === "error") {
              setError(event.message);
            }
          }
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : "Chat request failed");
        }
      } finally {
        setIsStreaming(false);
        setToolName(null);
        abortRef.current = null;
      }
    },
    [messages, context],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, toolName, error, send, stop, reset };
}
