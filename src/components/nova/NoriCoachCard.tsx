import Image from "next/image";

export type NoriState = "neutral" | "celebrating" | "warning" | "thinking";

// Intrinsic pixel dimensions of each PNG — Next/Image needs the real aspect
// ratio to avoid distorting the artwork when it's scaled down via `height`.
const ASSET_BY_STATE: Record<NoriState, { src: string; width: number; height: number }> = {
  neutral: { src: "/nova/nori-neutral.png", width: 1302, height: 1208 },
  celebrating: { src: "/nova/nori-celebrating.png", width: 1312, height: 1199 },
  warning: { src: "/nova/nori-warning.png", width: 1224, height: 1285 },
  thinking: { src: "/nova/nori-thinking.png", width: 1312, height: 1199 },
};

const ACCENT_BY_STATE: Record<NoriState, string> = {
  neutral: "border-border-subtle",
  celebrating: "border-positive/30",
  warning: "border-warning/30",
  thinking: "border-border-subtle",
};

type NoriCoachCardProps = {
  state: NoriState;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  /** "coach" (40-72px, sits inside ordinary cards) or "hero" (up to 180px, empty/onboarding states only). */
  size?: "coach" | "hero";
  /** "row" (default, image beside text) or "center" (stacked, for empty/onboarding states). */
  layout?: "row" | "center";
  onDismiss?: () => void;
  className?: string;
};

/**
 * Nori is a guide, never a financial adviser — per DESIGN_SPEC.md voice
 * rules, callers must keep copy calm and specific (no hype, no guarantees).
 * Artwork is imported directly from design-handoff/assets; never redrawn.
 */
export function NoriCoachCard({
  state,
  title,
  message,
  action,
  size = "coach",
  layout = "row",
  onDismiss,
  className = "",
}: NoriCoachCardProps) {
  const displayHeight = size === "hero" ? 96 : 52;
  const asset = ASSET_BY_STATE[state];
  const isCenter = layout === "center";

  return (
    <div
      className={`relative flex gap-3 rounded-xl border bg-surface-raised p-3 shadow-[var(--shadow-glow)] ${ACCENT_BY_STATE[state]} ${
        isCenter ? "flex-col items-center text-center" : "items-center text-left"
      } ${className}`}
    >
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden"
        style={{ width: displayHeight, height: displayHeight }}
      >
        <Image
          src={asset.src}
          alt=""
          width={asset.width}
          height={asset.height}
          className="h-full w-full object-contain"
        />
      </span>
      <div className={`min-w-0 flex-1 ${onDismiss ? "pr-8" : ""} ${isCenter ? "text-center" : "text-left"}`}>
        <p className="text-[11px] font-medium tracking-wide text-accent uppercase">Nori says</p>
        {size === "hero" ? (
          <h2 className="mt-0.5 text-lg font-semibold text-foreground">{title}</h2>
        ) : (
          <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{title}</p>
        )}
        <p className="mt-1 text-sm leading-snug text-text-secondary">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 text-sm font-medium text-accent hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 text-[11px] text-text-muted hover:text-foreground"
        >
          Hide
        </button>
      ) : null}
    </div>
  );
}
