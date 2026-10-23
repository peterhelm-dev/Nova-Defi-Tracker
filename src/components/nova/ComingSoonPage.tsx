import type { ReactNode } from "react";
import { NoriCoachCard } from "./NoriCoachCard";

/**
 * Scaffold for a nav destination with no integration behind it yet (Explore,
 * Swap, Earn, Rewards, Watchlist). Per the handoff prompt: "Do not implement
 * transaction execution or live-wallet behavior unless the repository
 * already has a safe integration and I explicitly request it" — so these
 * stay honest placeholders rather than faked functionality.
 */
export function ComingSoonPage({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-3">
        <NoriCoachCard
          state="thinking"
          title={`${title} is on the way`}
          message={description}
          size="hero"
          layout="center"
          className="max-w-md"
        />
        {note}
      </div>
    </div>
  );
}
