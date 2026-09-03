import Link from "next/link";
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
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            B
          </span>
          <span className="text-sm font-semibold text-white">NOVA</span>
        </Link>
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Back to dashboard
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">{title}</h1>
        {updated ? (
          <p className="mt-2 text-xs text-white/40">Last updated: {updated}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-white/70 [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-white/30 [&_a]:text-accent hover:[&_a]:underline">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
