import {
  ActivityIcon,
  EarnIcon,
  ExploreIcon,
  HomeIcon,
  ProfileIcon,
  ResearchIcon,
  RewardsIcon,
  SettingsIcon,
  SwapIcon,
} from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  /** Scaffolded nav destination with no real integration behind it yet. */
  comingSoon?: boolean;
};

/** Desktop sidebar — full NOVA information architecture per DESIGN_SPEC.md. */
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/", label: "Portfolio", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: ExploreIcon },
  { href: "/swap", label: "Swap", icon: SwapIcon, comingSoon: true },
  { href: "/earn", label: "Earn", icon: EarnIcon, comingSoon: true },
  { href: "/rewards", label: "Rewards", icon: RewardsIcon, comingSoon: true },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/research", label: "Research", icon: ResearchIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Mobile bottom nav — condensed set per DESIGN_SPEC.md mobile IA. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: ExploreIcon },
  { href: "/research", label: "Research", icon: ResearchIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/settings", label: "Profile", icon: ProfileIcon },
];
