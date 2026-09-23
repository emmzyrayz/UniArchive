// components/auth/steps/StepVerifyEmail.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { OTPInput } from "../UI/AuthOTPInput";
import AuthButton from "../UI/AuthButton";
import { errorMessage, postJson } from "@/lib/authClient";

interface StepVerifyEmailProps {
  email: string;
  otp: string;
  onChange: (value: string) => void;
  onVerified: () => void;
  onBack: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function StepVerifyEmail({
  email,
  otp,
  onChange,
  onVerified,
  onBack,
}: StepVerifyEmailProps) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
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

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setIsVerifying(true);

    try {
      const result = await postJson("/api/auth/verify-email", { email, code: otp });
      if (result.ok) {
        onVerified();
      } else {
        setError(errorMessage(result, "Invalid or expired code. Please try again."));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    startCooldown();
    setError("");
    onChange("");
    const result = await postJson("/api/auth/resend-verification", { email });
    setNotice(result.ok ? "A new code is on its way." : errorMessage(result));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">
          Check your inbox
        </h2>
        <p className="text-sm text-text-secondary">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-text-primary">{email}</span>. Enter
          it below to verify your email. The code expires in 15 minutes.
        </p>
      </div>

      <OTPInput length={6} value={otp} onChange={onChange} error={error} />

      {notice && (
        <p role="status" className="text-sm text-text-secondary">
          {notice}
        </p>
      )}

      <AuthButton
        label={isVerifying ? "Verifying..." : "Verify & Continue"}
        type="button"
        onClick={handleVerify}
        disabled={isVerifying || otp.length !== 6}
      />

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-text-secondary hover:text-text-primary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-primary hover:underline disabled:text-text-muted disabled:no-underline disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
