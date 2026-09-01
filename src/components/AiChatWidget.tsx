"use client";

import { useMemo, useRef, useState } from "react";
import { useAiChat } from "@/hooks/useAiChat";
import { formatUsd } from "@/lib/format";
import type { ChatContext } from "@/lib/chat";
import { MAX_ATTACHMENTS } from "@/lib/chat";
import type { TokenHolding } from "@/types";

const ACCEPTED_FILE_TYPES = "image/*,application/pdf,text/csv,text/plain";

/**
 * Floating AI chat assistant. Grounded in the dashboard's current holdings
 * snapshot, with tools for the user's stored positions/alerts/history, top
 * Base DeFi pools, and a live CoinGecko MCP connection for broader market
 * data. Works with or without a connected wallet.
 */
export function AiChatWidget({
  address,
  walletUsd,
  defiUsd,
  holdings,
}: {
  address: string | null | undefined;
  walletUsd: number;
  defiUsd: number;
  holdings: TokenHolding[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const context = useMemo<ChatContext>(
    () => ({
      address: address ?? null,
      walletUsd,
      defiUsd,
      totalUsd: walletUsd + defiUsd,
      holdings: holdings.map((h) => ({
        symbol: h.symbol,
        balance: h.balance,
        priceUsd: h.priceUsd,
        valueUsd: h.valueUsd,
      })),
    }),
    [address, walletUsd, defiUsd, holdings],
  );

  const { messages, isStreaming, toolName, error, send, stop, reset } = useAiChat(context);

  async function onSend() {
    const text = input;
    const pending = files;
    setInput("");
    setFiles([]);
    await send(text, pending);
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, MAX_ATTACHMENTS));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI chat"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl shadow-lg shadow-black/40 hover:bg-accent/90"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Wealth Assistant</p>
          <p className="text-xs text-white/40">Claude · live CoinGecko data</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-white/40 hover:text-white/70"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close AI chat"
            className="text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-white/40">
            Ask about your holdings, Base yield pools, or any coin&apos;s price —
            or attach a screenshot or CSV.
            {!address ? " Connect a wallet to ask about your own portfolio." : ""}
          </p>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-accent text-white"
                  : "bg-white/5 text-white/90"
              }`}
            >
              {message.attachments?.length ? (
                <p className="mb-1 text-xs opacity-70">
                  📎 {message.attachments.map((a) => a.name).join(", ")}
                </p>
              ) : null}
              {message.text || (message.role === "assistant" && isStreaming ? "…" : "")}
            </div>
          </div>
        ))}
        {toolName ? (
          <p className="text-xs text-white/40">Using {toolName}…</p>
        ) : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>

      {files.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-4 py-2">
          {files.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70"
            >
              {file.name}
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-end gap-2 border-t border-white/10 px-3 py-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={(e) => onPickFiles(e.target.files)}
          className="hidden"
          id="ai-chat-file-input"
        />
        <label
          htmlFor="ai-chat-file-input"
          className="cursor-pointer rounded-lg border border-white/15 px-2 py-2 text-sm text-white/60 hover:text-white"
          aria-label="Attach a file"
        >
          📎
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder={`Net worth: ${formatUsd(walletUsd + defiUsd)} · ask anything`}
          className="max-h-24 flex-1 resize-none rounded-lg border border-white/15 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-white/30 focus:border-accent focus:outline-none"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() && files.length === 0}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
