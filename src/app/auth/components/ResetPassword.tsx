// components/auth/ResetPassword.tsx
// Sets a new password with the short-lived reset token issued by
// /api/auth/verify-reset-code (handed over via sessionStorage by verify.tsx).
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "./UI/BrandLogo";
import AuthButton from "./UI/AuthButton";
import { PasswordFields, isPasswordValid } from "./UI/PasswordFields";
import {
  clearResetSession,
  errorMessage,
  postJson,
  readResetSession,
} from "@/lib/authClient";
import { useIsClient } from "@/hooks/useIsClient";

export default function ResetPasswordInstance() {
  const router = useRouter();
  const isClient = useIsClient();
  const resetSession = useMemo(
    () => (isClient ? readResetSession() : null),
    [isClient],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({
      ...prev,
      confirmPassword:
        confirmPassword && value !== confirmPassword
          ? "Passwords do not match."
          : "",
    }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setErrors((prev) => ({
      ...prev,
      confirmPassword: value !== password ? "Passwords do not match." : "",
    }));
  };

  const handleSubmit = async () => {
    if (!resetSession) return;
    const newErrors: Record<string, string> = {};

    if (!isPasswordValid(password)) {
      newErrors.password = "Please meet all password requirements above.";
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    setSubmitError("");
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await postJson("/api/auth/reset-password", {
        resetToken: resetSession.resetToken,
        password,
      });
      if (result.ok) {
        clearResetSession();
        router.push("/auth?view=success&kind=password-reset");
        return;
      }
      setSubmitError(errorMessage(result));
    } finally {
      setIsSubmitting(false);
    }
  };

  const header = (
    <div className="flex justify-between items-start">
      <BrandLogo size={48} />
      <div className="text-right">
        <p className="text-xl font-bold text-text-primary">UniArchive</p>
        <p className="text-sm text-text-secondary">Academic Management</p>
      </div>
    </div>
  );

  // Waiting for the client to read sessionStorage
  if (!isClient) {
    return (
      <div className="space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl">
        {header}
      </div>
    );
  }

  if (!resetSession) {
    return (
      <div className="space-y-6 bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl">
        {header}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-text-primary">
            Reset session expired
          </h1>
          <p className="text-sm text-text-secondary">
            For your security, reset sessions only last a few minutes and work
            in the tab where you verified your code.
          </p>
        </div>
        <Link
          href="/auth?view=forgot-password"
          className="inline-block text-sm font-semibold text-text-primary hover:underline"
        >
          Start again
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl">
      {header}

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-text-primary">
          Set a new password
        </h1>
        <p className="text-sm text-text-secondary">
          Choose a strong password for{" "}
          <span className="font-medium text-text-primary">{resetSession.email}</span>.
          You&apos;ll be signed out on all other devices.
        </p>
      </div>

      <div className="space-y-6">
        <PasswordFields
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={handlePasswordChange}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          errors={errors}
        />
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error"
        >
          {submitError}{" "}
          <Link href="/auth?view=forgot-password" className="font-semibold underline">
            Start again
          </Link>
        </div>
      )}

      <AuthButton
        label={isSubmitting ? "Resetting..." : "Reset Password"}
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
      />
    </div>
  );
}
