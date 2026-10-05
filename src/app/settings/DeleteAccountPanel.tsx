// app/settings/DeleteAccountPanel.tsx
// Settings > Account > Danger zone: delete the account with an emailed code
// (POST /api/user/delete-account/request, then /confirm). The account is
// erased 7 days later unless the user signs in before then.
"use client";

import { useState } from "react";
import { Button } from "@/components/UI/Buttons";
import { Modal } from "@/components/admin/ReviewModals";
import { OTPInput } from "@/app/auth/components/UI/AuthOTPInput";

type Step = "explain" | "code" | "done";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.message ?? `Something went wrong (HTTP ${res.status}).`);
  return data;
}

export function DeleteAccountPanel() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("explain");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [purgeAfter, setPurgeAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    if (step === "done") {
      // Signed out: a full reload (not a client navigation) so nothing of
      // the account stays in memory or on screen
      window.location.assign(new URL("/", window.location.origin).href);
      return;
    }
    setOpen(false);
    setStep("explain");
    setCode("");
    setError(null);
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const { sentTo: to } = await post<{ sentTo: string }>("/api/user/delete-account/request", {});
      setSentTo(to);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the code.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const { purgeAfter: when } = await post<{ purgeAfter: string }>("/api/user/delete-account/confirm", { code });
      setPurgeAfter(when);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't confirm.");
    } finally {
      setBusy(false);
    }
  };

  const when = purgeAfter
    ? new Date(purgeAfter).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="rounded-xl border border-error/30 bg-error/5 p-6">
      <h2 className="mb-2 font-semibold text-error">Danger zone</h2>
      <p className="mb-4 text-sm text-text-secondary">
        Delete your account. You have 7 days to change your mind: signing in during that time cancels it.
      </p>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Delete my account
      </Button>

      {open && (
        <Modal title={step === "done" ? "Your account will be deleted" : "Delete your account?"} onClose={close}>
          <div className="space-y-3 text-sm text-text-secondary">
            {step === "explain" && (
              <>
                <ul className="list-disc space-y-1 pl-5">
                  <li>You&apos;ll be signed out everywhere, and your profile is hidden at once.</li>
                  <li>
                    After 7 days we erase your account, your library and its files, highlights, reading progress, drafts,
                    badges and sign-in history.
                  </li>
                  <li>
                    Materials you published in the UniLibrary, typed questions and notes, and your comments stay for other
                    students, credited to &ldquo;a former member&rdquo;.
                  </li>
                  <li>Signing in before the 7 days are up cancels the deletion.</li>
                </ul>
                <p>
                  Want a copy first? Use <strong className="text-text-primary">Download my data</strong> under the Privacy
                  tab.
                </p>
                <p>We&apos;ll email you a code to confirm it&apos;s you.</p>
              </>
            )}

            {step === "code" && (
              <>
                <p>
                  Enter the 6-digit code we sent to <strong className="text-text-primary">{sentTo}</strong>. It expires in 10
                  minutes.
                </p>
                <OTPInput length={6} value={code} onChange={setCode} />
                <button
                  type="button"
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                  onClick={sendCode}
                  disabled={busy}
                >
                  Send a new code
                </button>
              </>
            )}

            {step === "done" && (
              <>
                <p>
                  Your account will be deleted on <strong className="text-text-primary">{when}</strong>. You&apos;ve been
                  signed out on every device, and we&apos;ve emailed you the details.
                </p>
                <p>Changed your mind? Sign in before then and nothing is deleted.</p>
              </>
            )}

            {error && (
              <p role="alert" className="text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {step !== "done" && (
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
              )}
              {step === "explain" && (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? "Sending..." : "Email me a code"}
                </button>
              )}
              {step === "code" && (
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy || code.length !== 6}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                >
                  {busy ? "Deleting..." : "Delete my account"}
                </button>
              )}
              {step === "done" && (
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
