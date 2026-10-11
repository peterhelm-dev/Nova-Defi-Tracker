"use client";

import { useState } from "react";

export function CopyAddressButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); the address is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
