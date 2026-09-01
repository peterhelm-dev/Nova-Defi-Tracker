/** Shared chat contract between the client hook and the /api/chat route. */

export type ChatRole = "user" | "assistant";

export type ChatAttachment = {
  name: string;
  mediaType: string;
  /** Base64-encoded file contents, no data: prefix. */
  dataBase64: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  attachments?: ChatAttachment[];
};

/** Snapshot of the dashboard the assistant is grounded in for this turn. */
export type ChatContext = {
  address: string | null;
  walletUsd: number;
  defiUsd: number;
  totalUsd: number;
  holdings: {
    symbol: string;
    balance: number;
    priceUsd: number | null;
    valueUsd: number;
  }[];
};

export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const MAX_ATTACHMENTS = 4;

/** Newline-delimited JSON events streamed from POST /api/chat. */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "error"; message: string }
  | { type: "done" };
