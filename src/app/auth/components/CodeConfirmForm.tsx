// components/auth/CodeConfirmForm.tsx
// 6-digit code entry shared by the new-device and Google-link screens: posts
// { otp, trustDevice } to `verifyUrl`, which starts the session, then loads
// the user and navigates on.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { OTPInput } from "./UI/AuthOTPInput";
import AuthButton from "./UI/AuthButton";
import { useUser } from "@/context/userContext";
import { errorMessage, postJson } from "@/lib/authClient";

const RESEND_COOLDOWN_SECONDS = 60;

interface CodeConfirmFormProps {
  verifyUrl: string;
  resendUrl: string;
  submitLabel: string;
  /** Used when the server doesn't name a destination. */
  defaultRedirect?: string;
  /** Extra links under the resend button ("Back to sign in", ...). */
  secondaryAction?: ReactNode;
}

/** The server already checks these; this is belt and braces. */
function isSamePath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

export function CodeConfirmForm({
  verifyUrl,
  resendUrl,
  submitLabel,
  defaultRedirect = "/home",
  secondaryAction,
}: CodeConfirmFormProps) {
  const router = useRouter();
  const { refreshUserData } = useUser();
  const [otp, setOtp] = useState("");
  const [trust, setTrust] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expired, setExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || expired) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await postJson<{ redirectTo?: string; expired?: boolean }>(verifyUrl, {
        otp,
        trustDevice: trust,
      });
      if (result.ok) {
        // The session cookie is set; load the user before leaving the page
        await refreshUserData({ force: true });
        router.push(isSamePath(result.data.redirectTo) ? result.data.redirectTo : defaultRedirect);
        return;
      }
      setOtp("");
      if (result.data.expired) setExpired(true);
      setError(errorMessage(result, "That code didn't work. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || expired) return;
    startCooldown();
    setError("");
    setOtp("");
    const result = await postJson<{ expired?: boolean }>(resendUrl, {});
    if (result.ok) {
      setNotice("A new code is on its way.");
    } else {
      if (result.data.expired) setExpired(true);
      setError(errorMessage(result));
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <OTPInput length={6} value={otp} onChange={setOtp} error={error} />

      {notice && (
        <p role="status" className="text-sm text-text-secondary">
          {notice}
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={trust}
          onChange={(e) => setTrust(e.target.checked)}
          className="accent-primary rounded border-neutral-300 dark:border-neutral-500"
        />
        Trust this device for 30 days
      </label>

      <AuthButton
        label={isSubmitting ? "Verifying..." : submitLabel}
        type="submit"
        disabled={isSubmitting || expired || otp.length !== 6}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {secondaryAction}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || expired}
          className="text-primary hover:underline disabled:text-text-muted disabled:no-underline disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
