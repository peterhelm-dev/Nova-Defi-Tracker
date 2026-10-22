"use client";

import { usePathname } from "next/navigation";

/** A short rise when the route changes. Reduced motion strips the animation in CSS. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
