import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "@coinbase/onchainkit/styles.css";
import {
  PRODUCT_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_TITLE,
  canonicalSiteUrl,
  metadataBaseUrl,
} from "@/lib/brand";
import "./globals.css";
import { normalizeTheme, THEME_COOKIE, themeBootScript } from "@/lib/themes";
import { Providers } from "./providers";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: PRODUCT_TITLE,
    template: `%s — ${PRODUCT_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  alternates: { canonical: canonicalSiteUrl() },
  openGraph: {
    title: PRODUCT_TITLE,
    description: PRODUCT_DESCRIPTION,
    siteName: PRODUCT_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_TITLE,
    description: PRODUCT_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#060816",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const theme = normalizeTheme(jar.get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript() }} />
        <Providers>{children}</Providers>
        {/* Cookieless page views. Sends only when Vercel Web Analytics is enabled for the project. */}
        <Analytics />
        {/* Optional second counter. Loads only when a Plausible domain is configured. */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        ) : null}
      </body>
    </html>
  );
}
