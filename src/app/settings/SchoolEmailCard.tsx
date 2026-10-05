// app/settings/SchoolEmailCard.tsx
// Settings > Account: add or change a school email after signup, in a popup
// (enter the address -> enter the emailed code -> done). The address must
// belong to the school on the profile (lib/userSchoolEmail.ts); verifying it
// earns the Verified Student badge.
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/UI/Buttons";
import { Modal } from "@/components/admin/ReviewModals";
import { OTPInput } from "@/app/auth/components/UI/AuthOTPInput";
import { checkSchoolEmail, schoolEmailError } from "@/lib/schoolEmail";

interface Status {
  school: string | null;
  schoolEmail: string | null;
  verifiedAt: string | null;
}

type Step = "email" | "code" | "done";

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.message ?? `Something went wrong (HTTP ${res.status}).`);
  return data;
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40";

export function SchoolEmailCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call<Status>("/api/user/school-email")
      .then(setStatus)
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const openModal = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setToken("");
    setError(null);
    setOpen(true);
  };

  const close = () => {
    if (!busy) setOpen(false);
  };

  const sendCode = async () => {
    // Same check as the server, for instant feedback (catalog-only schools
    // are checked on the server, against their own website)
    if (status?.school) {
      const check = checkSchoolEmail(email, status.school);
      if (!check.ok && check.reason !== "unknown_school") {
        setError(schoolEmailError(check, status.school));
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const data = await call<{ challengeToken: string }>("/api/user/school-email/send", { schoolEmail: email });
      setToken(data.challengeToken);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await call<Status>("/api/user/school-email/verify", { challengeToken: token, code }));
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify the code.");
    } finally {
      setBusy(false);
    }
  };

  const since = status?.verifiedAt
    ? new Date(status.verifiedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-6">
      <h2 className="mb-2 font-semibold text-text-primary">School email</h2>
      {loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      ) : !status ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : !status.school ? (
        <>
          <p className="mb-4 text-sm text-text-secondary">
            Set your school on your profile first, then confirm an email from it to get the Verified Student badge.
          </p>
          <Button variant="secondary" href="/profile/edit">
            Set your school
          </Button>
        </>
      ) : status.schoolEmail ? (
        <>
          <p className="text-sm text-text-primary">
            <span className="font-medium">{status.schoolEmail}</span>{" "}
            <span className="text-green-700 dark:text-green-400">✓ verified{since ? ` ${since}` : ""}</span>
          </p>
          <p className="mb-4 mt-1 text-sm text-text-secondary">This earned you the Verified Student badge.</p>
          <Button variant="secondary" onClick={openModal}>
            Change school email
          </Button>
        </>
      ) : (
        <>
          <p className="mb-4 text-sm text-text-secondary">
            Confirm an email from {status.school} to get the Verified Student badge on your profile. It stays private.
          </p>
          <Button variant="secondary" onClick={openModal}>
            Add school email
          </Button>
        </>
      )}

      {open && status?.school && (
        <Modal title={step === "done" ? "School email verified" : "Verify your school email"} onClose={close}>
          <div className="space-y-3 text-sm text-text-secondary">
            {step === "email" && (
              <form
                id="school-email-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendCode();
                }}
              >
                <label className="block">
                  <span className="mb-1 block">Your email from {status.school}</span>
                  <input
                    type="email"
                    autoComplete="off"
                    autoFocus
                    className={inputClass}
                    placeholder="student@school.edu.ng"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                  />
                </label>
                <p className="mt-2 text-xs text-text-muted">We&apos;ll email it a 6-digit code.</p>
              </form>
            )}
            {step === "code" && (
              <>
                <p>
                  Enter the code we sent to <strong className="text-text-primary">{email.trim().toLowerCase()}</strong>. It
                  expires in 10 minutes.
                </p>
                <OTPInput length={6} value={code} onChange={setCode} />
                <div className="flex justify-between text-xs">
                  <button type="button" className="text-primary hover:underline disabled:opacity-50" onClick={sendCode} disabled={busy}>
                    Send a new code
                  </button>
                  <button
                    type="button"
                    className="text-text-secondary hover:underline disabled:opacity-50"
                    onClick={() => {
                      setStep("email");
                      setError(null);
                    }}
                    disabled={busy}
                  >
                    Use a different email
                  </button>
                </div>
              </>
            )}
            {step === "done" && (
              <p>
                <strong className="text-text-primary">{status.schoolEmail}</strong> is verified. The Verified Student badge
                appears on your profile shortly.
              </p>
            )}

            {error && (
              <p role="alert" className="text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {step !== "done" && (
                <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
                  Cancel
                </button>
              )}
              {step === "email" && (
                <button
                  type="submit"
                  form="school-email-form"
                  disabled={busy || !email.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "Sending..." : "Send code"}
                </button>
              )}
              {step === "code" && (
                <button
                  type="button"
                  onClick={verify}
                  disabled={busy || code.length !== 6}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40"
                >
                  {busy ? "Verifying..." : "Verify"}
                </button>
              )}
              {step === "done" && (
                <button type="button" onClick={close} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                  Done
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
