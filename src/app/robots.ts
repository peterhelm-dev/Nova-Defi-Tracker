import type { MetadataRoute } from "next";
import { canonicalSiteUrl } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  const origin = canonicalSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
