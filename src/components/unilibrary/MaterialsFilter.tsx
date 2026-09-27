// components/unilibrary/MaterialsFilter.tsx
// UniLibrary filters. Desktop (lg+): a vertical sidebar. Mobile: the search
// box plus a "Filters (N)" toggle that opens the rest in a panel. Every
// change goes straight to onChange; the page debounces the search request.
"use client";

import { useState } from "react";
import { FiFilter, FiSearch, FiX } from "react-icons/fi";
import UniversityCombobox from "@/components/profile/UniversityCombobox";
import type { MaterialSort } from "@/types/unilibrary";
import { CATEGORY_TABS, LEVEL_OPTIONS, TIER_OPTIONS } from "./materialLabels";

export interface MaterialFilters {
  search: string;
  category: string;
  universityId: string;
  universityName: string;
  level: string;
  tier: string;
  sort: MaterialSort;
}

export const DEFAULT_FILTERS: MaterialFilters = {
  search: "",
  category: "",
  universityId: "",
  universityName: "",
  level: "",
  tier: "",
  sort: "recent",
};

/** Filters that differ from the defaults (category counts, it's a filter too). */
export function countActiveFilters(filters: MaterialFilters): number {
  return (
    Number(!!filters.search.trim()) +
    Number(!!filters.category) +
    Number(!!filters.universityId) +
    Number(!!filters.level) +
    Number(!!filters.tier) +
    Number(filters.sort !== DEFAULT_FILTERS.sort)
  );
}

interface MaterialsFilterProps {
  filters: MaterialFilters;
  onChange: (filters: Partial<MaterialFilters>) => void;
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
        selected
          ? "border-primary bg-primary/10 font-semibold text-primary"
          : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

// Scrolls sideways on mobile, wraps in the sidebar
const PILL_ROW =
  "flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible";

export function MaterialsFilter({ filters, onChange }: MaterialsFilterProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  // Search isn't in the panel, so it doesn't count toward the toggle's badge
  const panelCount = countActiveFilters({ ...filters, search: "" });

  return (
    <div className="space-y-3 lg:space-y-6">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search materials</span>
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search materials..."
            className="w-full rounded-lg border border-border bg-surface-raised py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-controls="unilibrary-filters"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm lg:hidden ${
            panelCount
              ? "border-primary text-primary"
              : "border-border text-text-secondary"
          }`}
        >
          <FiFilter size={14} aria-hidden />
          Filters{panelCount ? ` (${panelCount})` : ""}
        </button>
      </div>

      <div
        id="unilibrary-filters"
        className={`${
          panelOpen ? "block" : "hidden"
        } space-y-5 rounded-xl border border-border bg-surface-raised p-4 lg:block lg:space-y-6 lg:border-0 lg:bg-transparent lg:p-0`}
      >
        <Section title="Category">
          <div className={PILL_ROW}>
            {CATEGORY_TABS.map((tab) => (
              <Pill
                key={tab.id || "all"}
                selected={filters.category === tab.id}
                onClick={() => onChange({ category: tab.id })}
              >
                {tab.label}
              </Pill>
            ))}
          </div>
        </Section>

        <Section title="University">
          <UniversityCombobox
            value={
              filters.universityId
                ? { id: filters.universityId, name: filters.universityName || "Selected university" }
                : null
            }
            onChange={(u) => onChange({ universityId: u._id, universityName: u.name })}
          />
          {filters.universityId && (
            <button
              type="button"
              onClick={() => onChange({ universityId: "", universityName: "" })}
              className="mt-2 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
            >
              <FiX size={12} aria-hidden /> Any university
            </button>
          )}
        </Section>

        <Section title="Level">
          <div className={PILL_ROW}>
            <Pill selected={!filters.level} onClick={() => onChange({ level: "" })}>
              All
            </Pill>
            {LEVEL_OPTIONS.map((level) => (
              <Pill
                key={level}
                selected={filters.level === level}
                onClick={() => onChange({ level })}
              >
                {level}
              </Pill>
            ))}
          </div>
        </Section>

        <Section title="Verification">
          <div className={PILL_ROW}>
            {TIER_OPTIONS.map((tier) => (
              <Pill
                key={tier.id || "all"}
                selected={filters.tier === tier.id}
                onClick={() => onChange({ tier: tier.id })}
              >
                {tier.label}
              </Pill>
            ))}
          </div>
        </Section>

        <Section title="Sort">
          <select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as MaterialSort })}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="recent">Most recent</option>
            <option value="popular">Most popular</option>
          </select>
        </Section>
      </div>
    </div>
  );
}
