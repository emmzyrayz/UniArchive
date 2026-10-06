// components/DevModeBadge.tsx
// A floating "Dev mode" badge while dev mode signs you in automatically
// (lib/auth/devAuth.ts). Renders nothing in production builds: NODE_ENV is
// inlined there, so the inner component isn't even shipped.
"use client";

import { useEffect, useState } from "react";

type Status =
  | { active: false }
  | { active: true; upid: string; fullName: string; role: string }
  | { active: true; missing: string };

function DevModeBadgeInner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/dev-mode", { cache: "no-store" })
      .then((res) => res.json() as Promise<Status>)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status?.active) return null;
  const missing = "missing" in status;

  return (
    <div className="fixed left-1/2 top-1 z-[100] -translate-x-1/2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold shadow-lg ${
          missing ? "bg-red-600 text-white" : "bg-fuchsia-600 text-white"
        }`}
        title="Dev mode: sign-in is bypassed on localhost"
      >
        <span aria-hidden>🛠</span> DEV MODE{!missing && ` · @${status.upid}`}
      </button>
      {open && (
        <div className="mt-2 w-72 rounded-xl border border-fuchsia-500/40 bg-neutral-900 p-3 text-neutral-200 shadow-2xl">
          {missing ? (
            <p>
              DEV_USER_UPID is <code>{status.missing}</code>, but no account has that upid, so you&apos;re signed out. Fix it in
              .env.local and restart <code>pnpm dev</code>.
            </p>
          ) : (
            <>
              <p>
                Signed in automatically as <strong>{status.fullName}</strong> (@{status.upid}, {status.role}).
              </p>
              <p className="mt-2 text-neutral-400">
                Sign-in is bypassed only under <code>next dev</code> on localhost (DEV_USER_UPID in .env.local). If .env.local
                points at the real database, what you change here is real.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function DevModeBadge() {
  return process.env.NODE_ENV === "development" ? <DevModeBadgeInner /> : null;
}
