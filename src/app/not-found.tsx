import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl">
        🔍
      </span>
      <h1 className="text-xl font-semibold text-white">Page not found</h1>
      <p className="max-w-md text-sm text-white/60">
        That page doesn&apos;t exist. Your portfolio is still where you left it.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
