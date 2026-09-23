// components/auth/steps/StepSchoolEmail.tsx
"use client";

import { useState } from "react";
import AuthInput from "../UI/AuthInput";
import AuthButton from "../UI/AuthButton";
import { OTPInput } from "../UI/AuthOTPInput";

interface StepSchoolEmailProps {
  value: string;
  otp: string;
  locked: boolean;
  onChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onVerified: () => void;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StepSchoolEmail({
  value,
  otp,
  locked,
  onChange,
  onOtpChange,
  onVerified,
  onSkip,
  onNext,
  onBack,
}: StepSchoolEmailProps) {
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendCode = async () => {
    if (!EMAIL_REGEX.test(value)) {
      setError("Please enter a valid school email address.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      // TODO: trigger real OTP send to school email
      setOtpSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setIsSubmitting(true);
    try {
      // TODO: replace with real verification
      const isValid = true; // stubbed
      if (isValid) {
        onVerified();
        onNext();
      } else {
        setError("Invalid or expired code.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">
          School email (optional)
        </h2>
        <p className="text-sm text-text-secondary">
          Some institutions don&apos;t issue school emails — feel free to skip
          this if yours doesn&apos;t.
        </p>
      </div>

      <AuthInput
        name="schoolEmail"
        label="Academic Email"
        type="email"
        autoComplete="off"
        placeholder="student@university.edu.ng"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        disabled={locked || otpSent}
      />

      {otpSent && !locked && (
        <OTPInput length={6} value={otp} onChange={onOtpChange} />
      )}

      <div className="flex gap-3">
        <AuthButton
          label="Back"
          type="button"
          variant="secondary"
          onClick={onBack}
        />

        {!value ? (
          <AuthButton
            label="Skip for now"
            type="button"
            variant="secondary"
            onClick={onSkip}
          />
        ) : !otpSent ? (
          <AuthButton
            label={isSubmitting ? "Sending..." : "Send code"}
            type="button"
            onClick={handleSendCode}
            disabled={isSubmitting}
          />
        ) : (
          <AuthButton
            label={isSubmitting ? "Verifying..." : "Verify & Continue"}
            type="button"
            onClick={handleVerify}
            disabled={isSubmitting || otp.length !== 6}
          />
        )}
      </div>
    </div>
  );
}
