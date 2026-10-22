"use client";

import { ResearchDesk } from "@/components/ResearchDesk";
import { usePreferences } from "@/hooks/usePreferences";
import { researchItemId, type ResearchItem } from "@/lib/research";

export default function ResearchPage() {
  const { prefs, setPrefs } = usePreferences();

  function onToggleSaved(item: ResearchItem) {
    setPrefs((prev) => {
      const id = item.id.includes(":") ? item.id : researchItemId(item.kind, item.id);
      const exists = prev.researchWatchlist.some((saved) => saved.id === id);
      return {
        ...prev,
        researchWatchlist: exists
          ? prev.researchWatchlist.filter((saved) => saved.id !== id)
          : [{ ...item, id }, ...prev.researchWatchlist].slice(0, 40),
      };
    });
  }

  return <ResearchDesk saved={prefs.researchWatchlist} onToggleSaved={onToggleSaved} />;
}
