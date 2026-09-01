import Anthropic from "@anthropic-ai/sdk";
import type { ChatContext } from "@/lib/chat";
import { fetchBaseDefiPools } from "@/lib/server/defiPools";
import { getStore } from "@/lib/server/store";

export const CHAT_MODEL = "claude-opus-5";
export const MCP_CLIENT_BETA = "mcp-client-2025-11-20";

const COINGECKO_MCP_URL =
  process.env.COINGECKO_MCP_URL ?? "https://mcp.api.coingecko.com/sse";
const COINGECKO_MCP_NAME = "coingecko";

let client: Anthropic | null = null;

export function isChatConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** MCP connector definition for CoinGecko's public remote MCP server — gives
 * the assistant live market data (any coin, trending, global stats, charts)
 * beyond the curated Base token list the app fetches for its own dashboard. */
export function getMcpServers(): Anthropic.Beta.BetaRequestMCPServerURLDefinition[] {
  const authorization_token = process.env.COINGECKO_MCP_TOKEN || undefined;
  return [
    {
      type: "url",
      url: COINGECKO_MCP_URL,
      name: COINGECKO_MCP_NAME,
      ...(authorization_token ? { authorization_token } : {}),
    },
  ];
}

const CUSTOM_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_tracked_defi_positions",
    description:
      "Get the signed-in user's manually tracked DeFi positions (LP/staking positions they added from the dashboard's yield list), with amount invested and APY at entry. Requires the user to be signed in.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_price_alerts",
    description:
      "Get the signed-in user's configured price alert rules and any alerts that have fired but not been dismissed yet. Requires the user to be signed in.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_net_worth_history",
    description:
      "Get the signed-in user's daily net worth snapshot history (wallet + DeFi, in USD) as tracked by the app's scheduled job. Requires the user to be signed in.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_base_defi_pools",
    description:
      "Get top yield-bearing DeFi pools on the Base chain by TVL, from DeFiLlama. Use this for questions about where to earn yield on Base, independent of what the user has invested.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 30,
          description: "Max pools to return, default 10.",
        },
      },
      additionalProperties: false,
    },
  },
];

export function buildTools(): Anthropic.Beta.BetaToolUnion[] {
  return [
    ...CUSTOM_TOOLS,
    { type: "mcp_toolset", mcp_server_name: COINGECKO_MCP_NAME },
  ];
}

export function buildSystemPrompt(
  context: ChatContext,
): Anthropic.Beta.BetaTextBlockParam[] {
  const instructions = [
    "You are the AI assistant built into Base Wealth Tracker, an onchain net-worth dashboard for the Base network.",
    "Help the user understand their holdings, DeFi positions, and crypto markets in general.",
    "You have a live snapshot of the user's dashboard (below) plus tools for their stored data and a CoinGecko MCP connection for live market data (any coin, trending, global stats, historical charts).",
    "Prefer the dashboard snapshot for the user's current Base holdings; use tools when the question needs data outside that snapshot (e.g. a coin not on Base, historical prices, or the user's saved alerts/positions/history).",
    "Never give financial advice framed as certainty — flag volatility and note that all data can lag or be estimated. Keep answers concise and use USD formatting like $1,234.56.",
    context.address
      ? null
      : "No wallet is connected — you can still answer general crypto questions and use CoinGecko data, but you have no personal holdings to reference.",
  ]
    .filter(Boolean)
    .join(" ");

  const snapshot = {
    walletConnected: Boolean(context.address),
    walletUsd: context.walletUsd,
    defiUsd: context.defiUsd,
    totalUsd: context.totalUsd,
    holdings: context.holdings,
  };

  return [
    { type: "text", text: instructions, cache_control: { type: "ephemeral" } },
    {
      type: "text",
      text: `Current dashboard snapshot (JSON):\n${JSON.stringify(snapshot)}`,
    },
  ];
}

type ToolResult = { content: string; isError?: boolean };

/**
 * Executes one of our custom tools (everything except the CoinGecko MCP
 * toolset, which Anthropic executes server-side). `address` is the
 * session-verified wallet — tools that touch stored user data refuse
 * without it rather than trusting client-supplied identity.
 */
export async function runCustomTool(
  name: string,
  input: Record<string, unknown>,
  address: string | null,
): Promise<ToolResult> {
  if (name === "get_base_defi_pools") {
    const limit =
      typeof input.limit === "number" ? Math.min(30, Math.max(1, input.limit)) : 10;
    const pools = await fetchBaseDefiPools();
    if (!pools) return { content: "DeFi pool data is unavailable right now.", isError: true };
    return { content: JSON.stringify(pools.slice(0, limit)) };
  }

  if (
    name === "get_tracked_defi_positions" ||
    name === "get_price_alerts" ||
    name === "get_net_worth_history"
  ) {
    if (!address) {
      return {
        content: "The user is not signed in, so this data isn't available.",
        isError: true,
      };
    }

    const store = getStore();
    if (name === "get_tracked_defi_positions") {
      return { content: JSON.stringify(await store.getPositions(address)) };
    }
    if (name === "get_price_alerts") {
      const [rules, events] = await Promise.all([
        store.getAlertRules(address),
        store.getAlertEvents(address),
      ]);
      return { content: JSON.stringify({ rules, events }) };
    }
    return { content: JSON.stringify(await store.getSnapshots(address)) };
  }

  return { content: `Unknown tool: ${name}`, isError: true };
}
