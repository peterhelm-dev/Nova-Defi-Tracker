"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  generatedAvatarSrc,
  resolveWalletAvatar,
  WALLET_EMOJIS,
  walletTitle,
  type WalletAvatarChoice,
} from "@/lib/experience";
import { shortenAddress } from "@/lib/format";
import { playUiSound } from "@/lib/sounds";
import { MAX_WALLETS, type SavedWallet, type WalletIdentityPatch } from "@/hooks/useWalletBook";

export function AddWalletForm({
  onAdd,
}: {
  onAdd: (input: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onAdd(input);
      setInput("");
      playUiSound("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that wallet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="0x… or name.eth"
        aria-label="Wallet address or ENS"
        className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        data-sound="off"
        disabled={busy}
        className="pressable rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-accent/90 disabled:opacity-60"
      >
        {busy ? "Adding…" : "Add wallet"}
      </button>
      {error ? <p className="text-sm text-negative sm:basis-full">{error}</p> : null}
    </form>
  );
}

function useEnsAvatar(address: string) {
  return useQuery({
    queryKey: ["ens-avatar", address],
    enabled: address.startsWith("0x"),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/ens?name=${encodeURIComponent(address)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { avatar?: string | null };
      return data.avatar ?? null;
    },
  });
}

function WalletMark({ wallet }: { wallet: SavedWallet }) {
  const ens = useEnsAvatar(wallet.address);
  const visual = resolveWalletAvatar(wallet, ens.data, generatedAvatarSrc(wallet.address));
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-lg">
      {visual.emoji ? (
        <span aria-hidden>{visual.emoji}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- data URLs and ENS avatars
        <img src={visual.src ?? ""} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

function readAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Choose an image file"));
  if (file.size > 2_000_000) return Promise.reject(new Error("Use an image under 2 MB"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not read that image"));
          return;
        }
        const scale = Math.max(96 / img.width, 96 / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        ctx.drawImage(img, (96 - width) / 2, (96 - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("Could not read that image"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function IdentityEditor({
  wallet,
  onChange,
  onClose,
}: {
  wallet: SavedWallet;
  onChange: (patch: WalletIdentityPatch) => void;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(wallet.nickname ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2 rounded-xl border border-border-subtle bg-background/60 p-3">
      <label className="block text-xs text-text-muted" htmlFor={`nick-${wallet.address}`}>
        Nickname
      </label>
      <input
        id={`nick-${wallet.address}`}
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        onBlur={() => onChange({ nickname: nickname.trim() })}
        maxLength={32}
        placeholder="A name only you see"
        className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
      />
      <p className="mt-3 text-xs text-text-muted">Icon</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {WALLET_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Use ${emoji}`}
            onClick={() => onChange({ avatar: { kind: "emoji", value: emoji } })}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-hover"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:text-foreground">
          Upload image
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const value = await readAvatarFile(file);
                onChange({ avatar: { kind: "image", value } satisfies WalletAvatarChoice });
                setError(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not use that image");
              }
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ avatar: null })}
          className="text-xs text-text-muted hover:text-foreground"
        >
          Use generated icon
        </button>
        <button type="button" onClick={onClose} className="ml-auto text-xs text-accent hover:underline">
          Done
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-negative">{error}</p> : null}
    </div>
  );
}

export function WalletBook({
  connectedAddress,
  wallets,
  saved,
  onAdd,
  onRemove,
  onKeep,
  onUpdateIdentity,
}: {
  connectedAddress?: string;
  wallets: SavedWallet[];
  saved: SavedWallet[];
  onAdd: (input: string) => Promise<void>;
  onRemove: (address: string) => void;
  onKeep: () => void;
  onUpdateIdentity: (address: string, patch: WalletIdentityPatch) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const connected = connectedAddress?.toLowerCase();
  const connectedIsSaved = !!connected && saved.some((wallet) => wallet.address === connected);

  return (
    <section data-tour="wallets" className="rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Wallets</h2>
          <p className="mt-1 text-xs text-text-muted">
            Connect a wallet, or paste an address or ENS name to watch it. Novafolio
            never asks you to sign a transaction.
          </p>
        </div>
        <p className="text-xs text-text-muted">
          {wallets.length}/{MAX_WALLETS}
        </p>
      </div>

      {wallets.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {wallets.map((wallet) => {
            const isLiveConnection = wallet.address === connected && !connectedIsSaved;
            const title = walletTitle(wallet);
            return (
              <li
                key={wallet.address}
                className="rounded-xl border border-border-subtle px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <WalletMark wallet={wallet} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {title ?? shortenAddress(wallet.address, 6)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {wallet.source === "connected" ? "Connected" : "Watch-only"}
                        {title ? ` · ${shortenAddress(wallet.address, 4)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing((current) => (current === wallet.address ? null : wallet.address))
                      }
                      className="text-xs text-text-muted hover:text-foreground"
                    >
                      {editing === wallet.address ? "Close" : "Customize"}
                    </button>
                    {isLiveConnection ? (
                      <button
                        type="button"
                        onClick={onKeep}
                        className="text-xs text-accent hover:underline"
                      >
                        Keep
                      </button>
                    ) : null}
                    {wallet.source !== "connected" || connectedIsSaved ? (
                      <button
                        type="button"
                        onClick={() => onRemove(wallet.address)}
                        className="text-xs text-text-muted hover:text-negative"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                {editing === wallet.address ? (
                  <IdentityEditor
                    wallet={wallet}
                    onChange={(patch) => onUpdateIdentity(wallet.address, patch)}
                    onClose={() => setEditing(null)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-4">
        <AddWalletForm onAdd={onAdd} />
      </div>
    </section>
  );
}
