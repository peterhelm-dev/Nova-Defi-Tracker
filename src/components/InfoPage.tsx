import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { Footer } from "./Footer";

/**
 * Shared shell for static informational pages (terms, privacy, support):
 * consistent header, readable measure, and the standard footer.
 */
export function InfoPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-text-inverse"
      >
        Skip to content
      </a>
      <header className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <BrandMark />
        <Link href="/" className="text-sm text-text-secondary hover:text-foreground">
          ← Back to dashboard
        </Link>
      </header>

      <main id="page-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 outline-none">
        <h1 className="text-3xl font-bold">{title}</h1>
        {updated ? (
          <p className="mt-2 text-xs text-text-muted">Last updated: {updated}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-text-secondary [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-text-muted [&_a]:text-accent hover:[&_a]:underline">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
