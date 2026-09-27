// components/unilibrary/CategoryTabs.tsx
// Sticky, horizontally scrolling category tabs above the feed, each with its
// count of verified materials (other filters applied).
"use client";

import type { MaterialCategory } from "@/lib/constants/materialCategories";
import { CATEGORY_TABS } from "./materialLabels";

interface Props {
  active: string;
  counts: Partial<Record<MaterialCategory, number>>;
  /** False until the first response arrives, so counts don't flash as 0. */
  countsLoaded: boolean;
  onChange: (category: string) => void;
}

export function CategoryTabs({ active, counts, countsLoaded, onChange }: Props) {
  const all = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
      <div role="tablist" aria-label="Categories" className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORY_TABS.map((tab) => {
          const selected = tab.id === active;
          const count = tab.id ? (counts[tab.id] ?? 0) : all;
          return (
            <button
              key={tab.id || "all"}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`relative shrink-0 whitespace-nowrap px-3 py-3 text-sm transition-colors ${
                selected
                  ? "font-semibold text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {countsLoaded && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                    selected ? "bg-primary/10" : "bg-neutral-500/10"
                  }`}
                >
                  {count}
                </span>
              )}
              {selected && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
