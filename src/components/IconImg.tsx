"use client";

import { useState } from "react";

type IconImgProps = {
  src: string | null | undefined;
  alt: string;
  fallbackText: string;
  size?: number;
  className?: string;
};

/**
 * Small circular icon (coin/protocol/chain logo) that degrades to a plain
 * initial-letter avatar if the image is missing or fails to load — icons come
 * from third-party CDNs (Zerion, DeFiLlama) we don't control the uptime of.
 */
export function IconImg({ src, alt, fallbackText, size = 16, className = "" }: IconImgProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <span
        title={alt}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-white/60 ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.5) }}
      >
        {fallbackText.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- external, per-row icons; next/image adds no value here
  return (
    <img
      src={src}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}
