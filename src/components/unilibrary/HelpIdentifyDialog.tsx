// components/unilibrary/HelpIdentifyDialog.tsx
// "Help identify this PDF": a reader fills in what they believe an
// unverified material is (the same fields as a submission), starting from
// their earlier suggestion or the material's current details. Staff accept
// the best suggestion, which verifies the material.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import {
  AcademicFields,
  BasicsFields,
  EMPTY_MATERIAL_FORM,
  formFromSuggestion,
  materialBody,
  validateAcademic,
  validateBasics,
  type MaterialFormErrors,
  type MaterialFormState,
} from "@/components/submit/materialFields";
import type { MaterialSuggestionsResponse } from "@/types/unilibrary";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: MaterialSuggestionsResponse };

export function HelpIdentifyDialog({
  materialId,
  signedIn,
  onClose,
  onSent,
}: {
  materialId: string;
  signedIn: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [form, setForm] = useState<MaterialFormState>(EMPTY_MATERIAL_FORM);
  const [errors, setErrors] = useState<MaterialFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    fetch(`/api/materials/${materialId}/suggestions`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        return data as MaterialSuggestionsResponse;
      })
      .then((data) => {
        setLoad({ kind: "ready", data });
        setForm(formFromSuggestion(data.prefill));
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setLoad({ kind: "error", message: err.message || "Couldn't load." });
      });
    return () => controller.abort();
  }, [materialId, signedIn]);

  // Close on Escape, like the other dialogs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = useCallback(<K extends keyof MaterialFormState>(key: K, value: MaterialFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setMessage(null);
  }, []);

  const send = async () => {
    const found = { ...validateBasics(form), ...validateAcademic(form) };
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage("Some details need another look.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/materials/${materialId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(materialBody(form)),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? `Couldn't send it (HTTP ${res.status}).`);
      setDone(true);
      onSent?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't send it.");
    } finally {
      setBusy(false);
    }
  };

  const mine = load.kind === "ready" ? load.data.mine : null;
  const reviewed = mine && mine.status !== "pending";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-identify-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface-raised shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="help-identify-title" className="text-lg font-semibold text-text-primary">
              Help identify this PDF
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">Tell us what it is. A moderator checks suggestions before anything changes.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            <FiX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!signedIn ? (
            <p className="text-sm text-text-secondary">
              <Link href={`/auth?view=signin&from=${encodeURIComponent(`/materials/${materialId}`)}`} className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{" "}
              to suggest details, so the people who help get the credit.
            </p>
          ) : done ? (
            <div className="space-y-2 text-sm text-text-secondary">
              <p className="text-base font-semibold text-text-primary">Thank you!</p>
              <p>A moderator will check your suggestion. If it&apos;s used, it counts toward your contributions.</p>
            </div>
          ) : load.kind === "loading" ? (
            <div className="h-48 animate-pulse rounded-xl bg-surface" />
          ) : load.kind === "error" ? (
            <p className="text-sm text-red-600 dark:text-red-400">{load.message}</p>
          ) : reviewed ? (
            <p className="text-sm text-text-secondary">
              Your suggestion was {mine.status === "accepted" ? "used, thank you" : "reviewed"}. This PDF can&apos;t take another from you.
            </p>
          ) : (
            <div className="space-y-6">
              {mine && <p className="rounded-lg bg-primary/5 p-3 text-sm text-text-secondary">You suggested details before; change anything and send again to update them.</p>}
              {load.data.count > 0 && !mine && (
                <p className="text-xs text-text-muted">
                  {load.data.count} {load.data.count === 1 ? "person has" : "people have"} suggested details already. Yours helps us be sure.
                </p>
              )}
              <BasicsFields form={form} errors={errors} update={update} idPrefix="identify" />
              <AcademicFields form={form} errors={errors} update={update} setForm={setForm} idPrefix="identify" />
            </div>
          )}
        </div>

        {signedIn && !done && load.kind === "ready" && !reviewed && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
            {message && (
              <p role="alert" className="mr-auto text-sm text-red-600 dark:text-red-400">
                {message}
              </p>
            )}
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Sending..." : mine ? "Update my suggestion" : "Send suggestion"}
            </button>
          </div>
        )}
        {(done || !signedIn) && (
          <div className="flex justify-end border-t border-border p-4">
            <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
