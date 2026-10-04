// components/settings/EmailPrefsToggles.tsx
// The two bulk-email switches (lib/emailPrefs.ts), shared by Settings >
// Notifications and the no-sign-in /email-preferences page. Each switch
// saves on its own through `save`, which returns the stored values.
"use client";

import { useState } from "react";
import type { EmailKind, EmailPrefs } from "@/lib/emailPrefs";

const KINDS: { kind: EmailKind; label: string; desc: string }[] = [
  {
    kind: "announcements",
    label: "Announcements",
    desc: "New features, maintenance and important notices about UniArchive.",
  },
  {
    kind: "newsletter",
    label: "Newsletter",
    desc: "New materials in the UniLibrary, exam-season tips and calls for contributors.",
  },
];

export function EmailPrefsToggles({
  initial,
  save,
}: {
  initial: EmailPrefs;
  save: (change: Partial<EmailPrefs>) => Promise<EmailPrefs>;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<EmailKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = async (kind: EmailKind) => {
    const next = !prefs[kind];
    setSaving(kind);
    setError(null);
    setSaved(false);
    setPrefs((p) => ({ ...p, [kind]: next }));
    try {
      setPrefs(await save({ [kind]: next }));
      setSaved(true);
    } catch (err) {
      setPrefs((p) => ({ ...p, [kind]: !next }));
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {KINDS.map(({ kind, label, desc }) => (
        <div key={kind} className="flex items-center justify-between gap-4">
          <div>
            <p id={`email-${kind}`} className="text-sm font-medium text-text-primary">
              {label}
            </p>
            <p className="text-xs text-text-muted">{desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[kind]}
            aria-labelledby={`email-${kind}`}
            disabled={saving !== null}
            onClick={() => toggle(kind)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              prefs[kind] ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600"
            }`}
          >
            <span
              className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                prefs[kind] ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      ))}
      <p role="status" aria-live="polite" className="min-h-5 text-xs">
        {error ? (
          <span className="text-red-600 dark:text-red-400">{error}</span>
        ) : saved ? (
          <span className="text-text-muted">Saved.</span>
        ) : null}
      </p>
    </div>
  );
}

/** PATCH/POST helper: the saved preferences, or an Error with the server's message. */
export async function sendEmailPrefs(url: string, method: "PATCH" | "POST", body: unknown): Promise<EmailPrefs> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (EmailPrefs & { message?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.message ?? "Couldn't save. Try again.");
  return { announcements: data.announcements, newsletter: data.newsletter };
}
