// app/settings/EmailPrefsPanel.tsx
// Settings > Notifications: which bulk emails (broadcasts) the user gets.
// Account emails (codes, review results) always arrive.
"use client";

import { useEffect, useState } from "react";
import type { EmailPrefs } from "@/lib/emailPrefs";
import { EmailPrefsToggles, sendEmailPrefs } from "@/components/settings/EmailPrefsToggles";

export function EmailPrefsPanel() {
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user/email-preferences", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as (EmailPrefs & { message?: string }) | null;
        if (!res.ok || !data) throw new Error(data?.message ?? "Couldn't load your email settings.");
        setPrefs(data);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-6">
      <h2 className="font-semibold text-text-primary">Email</h2>
      <p className="mb-5 mt-1 text-sm text-text-secondary">
        Choose which updates we email you. Account emails, like sign-in codes and review results, always arrive.
      </p>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : prefs ? (
        <EmailPrefsToggles
          initial={prefs}
          save={(change) => sendEmailPrefs("/api/user/email-preferences", "PATCH", change)}
        />
      ) : (
        <p className="text-sm text-text-muted">Loading...</p>
      )}
    </div>
  );
}
