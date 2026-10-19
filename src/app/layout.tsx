import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import "@coinbase/onchainkit/styles.css";
import {
  PRODUCT_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_TITLE,
  canonicalSiteUrl,
  metadataBaseUrl,
} from "@/lib/brand";
import "./globals.css";
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
  themeColor: "#1a1511",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        {/* Privacy-respecting analytics (no cookies, no cross-site tracking).
            Loads only when a Plausible domain is configured. */}
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
