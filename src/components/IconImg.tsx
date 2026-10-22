"use client";

import { useState } from "react";
import { monogramLabel, monogramStyle } from "@/lib/tokenIcons";

type IconImgProps = {
  src?: string | null;
  /** Tried in order. A failed image advances to the next, then a monogram. */
  sources?: (string | null | undefined)[];
  alt: string;
  fallbackText: string;
  size?: number;
  className?: string;
};

/**
 * Small logo that tries each source, then a colored monogram. Remote icons
 * (Trust Wallet, DeFiLlama, Alchemy) fail often enough that the fallback has
 * to look intentional.
 */
export function IconImg({
  src,
  sources,
  alt,
  fallbackText,
  size = 16,
  className = "",
}: IconImgProps) {
  const list = (sources?.length ? sources : [src]).filter((item): item is string => !!item);
  const sourceKey = list.join("|");
  const [attempt, setAttempt] = useState(0);
  const [seenKey, setSeenKey] = useState(sourceKey);
  if (seenKey !== sourceKey) {
    setSeenKey(sourceKey);
    setAttempt(0);
  }

  const current = list[attempt];
  if (!current) {
    const style = monogramStyle(fallbackText);
    const label = monogramLabel(fallbackText);
    return (
      <span
        title={alt}
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(8, size * (label.length > 1 ? 0.36 : 0.46)),
          background: style.background,
          color: style.color,
        }}
      >
        {label}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external per-row icons; next/image needs a remote allowlist
    <img
      src={current}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-full bg-surface-raised object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setAttempt((value) => value + 1)}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}
