// components/admin/SuggestionsPanel.tsx
// Readers' "Help identify this PDF" suggestions for an unverified material,
// grouped by agreement ("3 people: Past Question · MTH101 · UNIZIK · 100L"),
// for staff to use. Shared by the submission review drawer (verify with a
// suggestion) and the platform verify workspace (fill the form from one).
"use client";

import { useEffect, useState } from "react";
import type { MaterialSuggestionsResponse, SuggestionGroupDto } from "@/types/unilibrary";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; groups: SuggestionGroupDto[] };

export function SuggestionsPanel({
  materialId,
  actionLabel,
  onUse,
  disabled,
}: {
  materialId: string;
  /** e.g. "Verify with these details" or "Use these details" */
  actionLabel?: string;
  /** Called with the group and the suggestion to credit (its newest) */
  onUse?: (group: SuggestionGroupDto, suggestionId: string) => void;
  disabled?: boolean;
}) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/materials/${materialId}/suggestions`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        return data as MaterialSuggestionsResponse;
      })
      .then((data) => setLoad({ kind: "ready", groups: data.groups ?? [] }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setLoad({ kind: "error", message: err.message || "Couldn't load suggestions." });
      });
    return () => controller.abort();
  }, [materialId]);

  return (
    <section aria-labelledby="suggestions-title">
      <h3 id="suggestions-title" className="mb-2 text-sm font-semibold text-text-primary">
        Readers&apos; suggestions
        {load.kind === "ready" && load.groups.length > 0 && (
          <span className="font-normal text-text-muted"> ({load.groups.reduce((n, g) => n + g.count, 0)})</span>
        )}
      </h3>
      {load.kind === "loading" ? (
        <div className="h-16 animate-pulse rounded-lg bg-surface" />
      ) : load.kind === "error" ? (
        <p className="text-sm text-red-600 dark:text-red-400">{load.message}</p>
      ) : load.groups.length === 0 ? (
        <p className="text-sm text-text-muted">No suggestions yet. Readers can suggest details from the PDF&apos;s page while it&apos;s unverified.</p>
      ) : (
        <ul className="space-y-2">
          {load.groups.map((g) => {
            const f = g.fields;
            const place = [f.universityName, f.facultyName, f.departmentName].filter(Boolean).join(" · ");
            return (
              <li key={g.fingerprint} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">{g.summary || "Details"}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      g.count > 1 ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-neutral-500/10 text-text-secondary"
                    }`}
                  >
                    {g.count} {g.count === 1 ? "person" : "people agree"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-primary">{f.title}</p>
                {place && <p className="text-xs text-text-secondary">{place}</p>}
                <p className="text-xs text-text-secondary">
                  {[f.courseName, f.semester && `${f.semester} semester`, f.academicYear].filter(Boolean).join(" · ")}
                </p>
                {f.description && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{f.description}</p>}
                <p className="mt-1 text-xs text-text-muted">by {g.suggestions.map((s) => `@${s.upid}`).join(", ")}</p>
                {onUse && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onUse(g, g.suggestions[0].id)}
                    className="mt-2 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-40"
                  >
                    {actionLabel ?? "Use these details"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
