import type { ReactNode } from "react";

type IconProps = { className?: string };

const base = "h-5 w-5";

function Svg({ className = base, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.8V19a1 1 0 0 0 1 1H10v-5.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h2.5a1 1 0 0 0 1-1V9.8" />
    </Svg>
  );
}

export function ExploreIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.25" />
      <path
        d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

export function SwapIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 7h11l-2.5-2.5" />
      <path d="M17 17H6l2.5 2.5" />
    </Svg>
  );
}

export function EarnIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M15.1 8.7H10.1a2.15 2.15 0 0 0 0 4.3h3.8a2.15 2.15 0 0 1 0 4.3H8.9" />
      <path d="M12 6.7v10.6" />
    </Svg>
  );
}

export function RewardsIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 9h14l-1.2 9.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
      <path d="M8.5 9c0-2.2 1.6-4 3.5-4s3.5 1.8 3.5 4" />
      <path d="M12 9v10" />
    </Svg>
  );
}

export function ActivityIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 12h4.2l2.1-5.5 3.6 11 2.1-5.5H21" />
    </Svg>
  );
}

export function WatchlistIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m12 3.8 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.1l5-.7z" />
    </Svg>
  );
}

export function SettingsIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h3.2M12.2 7H20" />
      <circle cx="8.7" cy="7" r="2.15" />
      <path d="M4 12h7.2M16.4 12H20" />
      <circle cx="13.8" cy="12" r="2.15" />
      <path d="M4 17h5M14.2 17H20" />
      <circle cx="11.1" cy="17" r="2.15" />
    </Svg>
  );
}

export function ProfileIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5 19.2a7 7 0 0 1 14 0" />
    </Svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m20 20-3.8-3.8" />
    </Svg>
  );
}

export function BellIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.4 5.4 1.4 5.4H4.6S6 13.5 6 9.5Z" />
      <path d="M10 18.2a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function EyeIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

export function EyeOffIcon({ className = base }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 4.5 20 19.5" />
      <path d="M9.9 6.2A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.1 3.8" />
      <path d="M6.6 7.4C4 9.2 2.5 12 2.5 12S6 18 12 18a9 9 0 0 0 4-.9" />
      <path d="M10 10.2a2.6 2.6 0 0 0 3.6 3.6" />
    </Svg>
  );
}

export function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}
