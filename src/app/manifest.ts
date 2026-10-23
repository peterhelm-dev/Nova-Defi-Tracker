import type { MetadataRoute } from "next";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";

const defaultTheme = THEMES.find((theme) => theme.id === DEFAULT_THEME) ?? THEMES[0];

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: defaultTheme.colors.background,
    theme_color: defaultTheme.colors.background,
    icons: [
      {
        src: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/nova/app-icon.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  };
}
