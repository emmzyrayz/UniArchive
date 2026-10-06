// components/unilibrary/HelpIdentify.tsx
// "Help identify this PDF" as a floating panel that doesn't block the page,
// so people can keep reading (on /materials/[id] and in the reader) while
// they fill it in. A launcher button opens it from anywhere; the panel can be
// dragged by its header (computer), minimised to a bar, and closed without
// losing what was typed (it stays mounted). On phones it's a bottom sheet.
// The form: a reader suggests the details of an unverified material (same
// fields as a submission), starting from their earlier suggestion or the
// material's current details. Staff accept the best suggestion.
"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { FiChevronDown, FiChevronUp, FiMove, FiX } from "react-icons/fi";
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

const DESKTOP = 640; // px: below this the panel is a bottom sheet
const MARGIN = 8;

function HelpIdentifyPanel({
  materialId,
  signedIn,
  onClose,
}: {
  materialId: string;
  signedIn: boolean;
  onClose: () => void;
}) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [form, setForm] = useState<MaterialFormState>(EMPTY_MATERIAL_FORM);
  const [errors, setErrors] = useState<MaterialFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [minimised, setMinimised] = useState(false);
  // Where the panel was dragged to (computer); null = its corner
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

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

  // Keep a dragged panel on screen when the window shrinks
  useEffect(() => {
    const onResize = () =>
      setPos((p) => {
        const el = panelRef.current;
        if (!p || !el || window.innerWidth < DESKTOP) return null;
        return {
          x: Math.min(p.x, window.innerWidth - el.offsetWidth - MARGIN),
          y: Math.min(p.y, window.innerHeight - 48),
        };
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth < DESKTOP || (e.target as HTMLElement).closest("button")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault(); // no text selection while dragging
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!drag.current || !el) return;
    setPos({
      x: Math.max(MARGIN, Math.min(e.clientX - drag.current.dx, window.innerWidth - el.offsetWidth - MARGIN)),
      y: Math.max(MARGIN, Math.min(e.clientY - drag.current.dy, window.innerHeight - 48)),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't send it.");
    } finally {
      setBusy(false);
    }
  };

  const mine = load.kind === "ready" ? load.data.mine : null;
  const reviewed = mine && mine.status !== "pending";
  const showForm = signedIn && !done && load.kind === "ready" && !reviewed;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="help-identify-title"
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={`fixed z-[65] flex flex-col border border-border bg-surface-raised shadow-2xl ${
        pos ? "" : "inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-4 sm:left-4"
      } w-full rounded-t-2xl sm:w-[440px] sm:rounded-2xl ${minimised ? "" : "max-h-[75vh] sm:max-h-[min(80vh,720px)]"}`}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`flex select-none items-center gap-2 border-b border-border px-4 py-3 sm:cursor-move ${minimised ? "border-b-0" : ""}`}
      >
        <FiMove className="hidden shrink-0 text-text-muted sm:block" aria-hidden />
        <h2 id="help-identify-title" className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
          🕵️ Help identify this PDF
        </h2>
        <button
          type="button"
          onClick={() => setMinimised((m) => !m)}
          aria-label={minimised ? "Expand" : "Minimise"}
          title={minimised ? "Expand" : "Minimise (keeps what you typed)"}
          className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text-primary"
        >
          {minimised ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close (keeps what you typed until you leave the page)"
          className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text-primary"
        >
          <FiX />
        </button>
      </div>

      <div className={minimised ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-4 text-xs text-text-secondary">
            Keep reading and tell us what it is. A moderator checks suggestions before anything changes.
          </p>
          {!signedIn ? (
            <p className="text-sm text-text-secondary">
              <Link
                href={`/auth?view=signin&from=${encodeURIComponent(`/materials/${materialId}`)}`}
                className="font-semibold text-primary hover:underline"
              >
                Sign in
              </Link>{" "}
              to suggest details, so the people who help get the credit.
            </p>
          ) : done ? (
            <div className="space-y-2 text-sm text-text-secondary">
              <p className="text-base font-semibold text-text-primary">Thank you!</p>
              <p>A moderator will check your suggestion. If it&apos;s used, it counts toward your PDF Detective badge.</p>
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
              {mine && (
                <p className="rounded-lg bg-primary/5 p-3 text-sm text-text-secondary">
                  You suggested details before; change anything and send again to update them.
                </p>
              )}
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

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-3">
          {message && (
            <p role="alert" className="mr-auto text-sm text-red-600 dark:text-red-400">
              {message}
            </p>
          )}
          {showForm ? (
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Sending..." : mine ? "Update my suggestion" : "Send suggestion"}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The launcher button and the floating panel for one unverified material.
 * `open` is controlled so other parts of the page (the unverified notice,
 * the callout, the reader banner) can open it too.
 */
export function HelpIdentify({
  materialId,
  signedIn,
  open,
  onOpenChange,
  aboveBottomNav = false,
}: {
  materialId: string;
  signedIn: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lift the launcher above the site's mobile bottom bar */
  aboveBottomNav?: boolean;
}) {
  // Mounted from the first open, then only hidden, so typing survives a close
  const [used, setUsed] = useState(false);
  if (open && !used) setUsed(true);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className={`fixed left-4 z-[45] flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-lg hover:bg-amber-400 ${
            aboveBottomNav ? "bottom-20 xl:bottom-6" : "bottom-6"
          }`}
        >
          <span aria-hidden>🕵️</span> Help identify this PDF
        </button>
      )}
      {used && (
        <div className={open ? "" : "hidden"}>
          <HelpIdentifyPanel materialId={materialId} signedIn={signedIn} onClose={() => onOpenChange(false)} />
        </div>
      )}
    </>
  );
}
