"use client";

// "Fill in the numbers" for the Monthly digest template: asks
// /api/admin/broadcasts/digest-stats for a month and writes the month label,
// the stat lines and the standout materials into the draft's fields, where
// the admin can still edit them.
import { useState } from "react";
import type { MaterialRef, TemplateFields } from "@/lib/broadcast/templates";
import { adminRequest, inputClass, secondaryButton } from "../adminUi";

interface DigestStatsDto {
  monthLabel: string;
  stats: string[];
  materials: MaterialRef[];
}

/** The calendar month before now, in Lagos time, as "YYYY-MM". */
function lastMonth(): string {
  const lagos = new Date(Date.now() + 60 * 60 * 1000);
  const d = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function DigestNumbers({ fields, onChange }: { fields: TemplateFields; onChange: (fields: TemplateFields) => void }) {
  const [month, setMonth] = useState(lastMonth);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const fill = async () => {
    setBusy(true);
    setNote(null);
    try {
      const data = await adminRequest<DigestStatsDto>(`/api/admin/broadcasts/digest-stats?month=${encodeURIComponent(month)}`);
      onChange({ ...fields, month: data.monthLabel, stats: data.stats, materials: data.materials });
      setNote({
        tone: "ok",
        text: data.stats.length
          ? `Filled in ${data.stats.length} numbers and ${data.materials.length} standout materials for ${data.monthLabel}. Check them before sending.`
          : `Nothing happened in ${data.monthLabel}, so there are no numbers to show.`,
      });
    } catch (error) {
      setNote({ tone: "error", text: error instanceof Error ? error.message : "Couldn't load the numbers." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <p className="text-sm font-medium text-text-secondary">Numbers from the database</p>
      <p className="mb-2 text-xs text-text-muted">
        Replaces the month, the numbers and the standout materials below with what happened that month.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          aria-label="Month"
          className={inputClass}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button type="button" className={secondaryButton} disabled={busy || !month} onClick={fill}>
          {busy ? "Counting..." : "Fill in the numbers"}
        </button>
      </div>
      {note && (
        <p
          role={note.tone === "error" ? "alert" : "status"}
          className={`mt-2 text-xs ${note.tone === "error" ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
