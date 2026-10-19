import { Footer } from "@/components/Footer";
import { GuidedTour } from "@/components/GuidedTour";
import { PageTransition } from "@/components/PageTransition";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

/**
 * Owns responsive navigation, max width, and page gutters, per
 * component-specs/components.md. Sidebar collapses to a bottom nav below the
 * `600px` breakpoint (DESIGN_SPEC.md breakpoints).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <div className="app-atmosphere pointer-events-none absolute inset-0" aria-hidden>
        <div className="app-grain" />
      </div>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          id="main-content"
          className="relative mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 min-[1200px]:px-8"
        >
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer className="pb-24 min-[600px]:pb-6" />
      </div>
      <BottomNav />
      <GuidedTour />
    </div>
  );
}
