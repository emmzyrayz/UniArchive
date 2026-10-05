// app/settings/DataExportCard.tsx
// Settings > Privacy: "Download my data" (GET /api/user/data-export).
"use client";

import { useState } from "react";
import { Button } from "@/components/UI/Buttons";

export function DataExportCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/data-export", { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? `Couldn't prepare your data (HTTP ${res.status}).`);
      }
      const name =
        res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "uniarchive-data.json";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare your data.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-6">
      <h2 className="mb-2 font-semibold text-text-primary">Your data</h2>
      <p className="mb-4 text-sm text-text-secondary">
        Your documents are private to your account, and we encrypt your email and phone number before storing them.
        Download a copy of everything we hold about you: your profile, library details, highlights, contributions,
        comments, sign-in history and more (one JSON file; your uploaded files themselves are in your library).
      </p>
      <Button variant="secondary" onClick={download} disabled={busy}>
        {busy ? "Preparing..." : "Download my data"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
