import { IconImg } from "./IconImg";

type BadgeProps = {
  label: string;
  /** Optional protocol/app logo shown before the label. */
  iconUrl?: string | null;
};

/** Small pill used to tag a position with its protocol/app, with an optional logo. */
export function Badge({ label, iconUrl }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white/70">
      {iconUrl !== undefined && (
        <IconImg src={iconUrl} alt={label} fallbackText={label} size={12} />
      )}
      {label}
    </span>
  );
}
