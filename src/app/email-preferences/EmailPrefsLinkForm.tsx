// app/email-preferences/EmailPrefsLinkForm.tsx
"use client";

import Link from "next/link";
import type { EmailPrefs } from "@/lib/emailPrefs";
import { EmailPrefsToggles, sendEmailPrefs } from "@/components/settings/EmailPrefsToggles";

export function EmailPrefsLinkForm({ upid, token, initial }: { upid: string; token: string; initial: EmailPrefs }) {
  return (
    <>
      <EmailPrefsToggles
        initial={initial}
        save={(change) => sendEmailPrefs("/api/email-preferences", "POST", { u: upid, t: token, ...change })}
      />
      <p className="mt-4 text-xs text-text-muted">
        You can also change these any time in{" "}
        <Link href="/settings?tab=notifications" className="text-primary hover:underline">
          Settings
        </Link>
        .
      </p>
    </>
  );
}
