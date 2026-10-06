// components/unilibrary/ReportMaterialDialog.tsx
// Report a UniLibrary material (POST /api/materials/[id]/report). Signed
// out, it asks the person to sign in first.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/admin/ReviewModals";
import { MATERIAL_REPORT_REASONS, type MaterialReportReason } from "@/lib/constants/materialReports";

export function ReportMaterialDialog({
  materialId,
  signedIn,
  onClose,
}: {
  materialId: string;
  signedIn: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<MaterialReportReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/materials/${materialId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? `Couldn't send the report (HTTP ${res.status}).`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Report this material" onClose={onClose}>
      {!signedIn ? (
        <p className="text-sm text-text-secondary">
          <Link href={`/auth?view=signin&from=${encodeURIComponent(`/materials/${materialId}`)}`} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          to report a material, so we can follow up if needed.
        </p>
      ) : done ? (
        <div className="space-y-4 text-sm text-text-secondary">
          <p>Thanks. Our team will take a look.</p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-text-secondary">What&apos;s wrong?</legend>
            {MATERIAL_REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                <input type="radio" name="reason" className="h-4 w-4 accent-primary" checked={reason === r.value} onChange={() => setReason(r.value)} />
                {r.label}
              </label>
            ))}
          </fieldset>
          <textarea
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={3}
            maxLength={500}
            placeholder="Anything that helps us check (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Details (optional)"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!reason || busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send report"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
