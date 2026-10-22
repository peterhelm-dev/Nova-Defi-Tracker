import type { MetadataRoute } from "next";
import { canonicalSiteUrl } from "@/lib/brand";

/** Public pages only. API routes and account actions stay out of the index. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = canonicalSiteUrl();
  const paths = ["/", "/explore", "/research", "/activity", "/pricing", "/support", "/privacy", "/terms"];
  return paths.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" || path === "/research" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
