"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PRODUCT_NAME, PRODUCT_TITLE } from "@/lib/brand";
import { PAGE_TITLES } from "@/components/nova/pageTitles";

/** Keeps the browser tab honest after a client navigation. The root layout owns the first paint. */
export function RouteTitle() {
  const pathname = usePathname();
  useEffect(() => {
    const page = PAGE_TITLES[pathname];
    document.title = page && pathname !== "/" ? `${page} — ${PRODUCT_NAME}` : PRODUCT_TITLE;
  }, [pathname]);
  return null;
}
