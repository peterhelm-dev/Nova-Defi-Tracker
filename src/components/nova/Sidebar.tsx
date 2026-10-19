"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { NoriCoachCard } from "./NoriCoachCard";
import { SIDEBAR_ITEMS } from "./navItems";

/** Persistent desktop sidebar — logo, primary nav, and compact Nori coach card, per DESIGN_SPEC.md. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-[1200px]:flex w-[232px] shrink-0 flex-col border-r border-border-subtle bg-background-sidebar px-4 py-6">
      <BrandMark className="px-2" wordmarkClassName="font-display text-lg font-bold text-foreground" />

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "bg-accent/15 text-foreground"
                  : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
                {item.label}
              </span>
              {item.comingSoon && (
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-text-muted">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <NoriCoachCard
        state="neutral"
        title="Not financial advice"
        message="Novafolio reads public chain data. It can't move funds or tell you what to buy."
        size="coach"
      />
    </aside>
  );
}
