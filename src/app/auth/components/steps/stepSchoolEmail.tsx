// components/auth/steps/StepSchoolEmail.tsx
// Optional signup step: prove a school email with an emailed code. The
// address must belong to the school picked on the Profile step
// (lib/schoolEmail.ts, checked again on the server). The challenge token
// from /api/auth/school-email/send lives in the wizard's state so it
// survives moving between steps; register stores the verified address and
// it earns the Verified Student badge.
"use client";

import { useState } from "react";
import AuthInput from "../UI/AuthInput";
import AuthButton from "../UI/AuthButton";
import { OTPInput } from "../UI/AuthOTPInput";
import { errorMessage, postJson } from "@/lib/authClient";
import { checkSchoolEmail, schoolEmailError } from "@/lib/schoolEmail";

interface StepSchoolEmailProps {
  value: string;
  /** A catalog university (id), or the name of one that isn't listed */
  school: { id?: string; name: string; abbreviation?: string; website?: string } | null;
  otp: string;
  // Set once a code was sent; verified once the code was accepted
  challengeToken: string;
  verified: boolean;
  onChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onCodeSent: (challengeToken: string) => void;
  onVerified: () => void;
  // Forget the code / verification to use a different address
  onReset: () => void;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSchoolEmail({
  value,
  school,
  otp,
  challengeToken,
  verified,
  onChange,
  onOtpChange,
  onCodeSent,
  onVerified,
  onReset,
  onSkip,
  onNext,
  onBack,
}: StepSchoolEmailProps) {
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeSent = !!challengeToken && !verified;
  const schoolName = school?.name ?? "";

  const sendCode = async () => {
    if (!school) {
      setError("Pick your institution on the Profile step first.");
      return;
    }
    const check = checkSchoolEmail(value, school);
    if (!check.ok) {
      setError(
        check.reason === "unknown_school" && !school.id
          ? "We can't check emails for a school we don't list yet. Skip this for now and add it from Settings once your school is added."
          : schoolEmailError(check, schoolName),
      );
      return;
    }
    setError("");
    setInfo("");
    setIsSubmitting(true);
    try {
      const result = await postJson<{ challengeToken?: string }>("/api/auth/school-email/send", {
        schoolEmail: check.email,
        ...(school.id ? { universityId: school.id } : { school: schoolName }),
      });
      if (result.ok && result.data.challengeToken) {
        onOtpChange("");
        onCodeSent(result.data.challengeToken);
        setInfo(`We sent a 6-digit code to ${check.email}. It can take a minute to arrive.`);
      } else {
        setError(errorMessage(result));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const result = await postJson("/api/auth/school-email/verify", {
        challengeToken,
        code: otp,
      });
      if (result.ok) {
        onVerified();
        onNext();
      } else {
        setError(errorMessage(result));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const useDifferentEmail = () => {
    setError("");
    setInfo("");
    onReset();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">
          School email (optional)
        </h2>
        <p className="text-sm text-text-secondary">
          Confirm an email from {schoolName || "your school"} to get a Verified
          Student badge on your profile. Some institutions don&apos;t issue
          school emails, so feel free to skip this.
        </p>
      </div>

      <AuthInput
        name="schoolEmail"
        label="Academic Email"
        type="email"
        autoComplete="off"
        placeholder="student@university.edu.ng"
        value={value}
        onChange={(e) => {
          setError("");
          onChange(e.target.value);
        }}
        error={codeSent ? undefined : error}
        disabled={verified || codeSent || isSubmitting}
      />

      {verified && (
        <p role="status" className="text-sm font-medium text-success">
          ✓ School email verified.
        </p>
      )}

      {codeSent && (
        <div className="space-y-3">
          {info && <p className="text-sm text-text-secondary">{info}</p>}
          <OTPInput length={6} value={otp} onChange={onOtpChange} error={error} />
          <div className="flex justify-between text-sm">
            <button
              type="button"
              className="text-primary hover:underline disabled:opacity-50"
              onClick={sendCode}
              disabled={isSubmitting}
            >
              Resend code
            </button>
            <button
              type="button"
              className="text-text-secondary hover:underline disabled:opacity-50"
              onClick={useDifferentEmail}
              disabled={isSubmitting}
            >
              Change email
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <AuthButton
          label="Back"
          type="button"
          variant="secondary"
          onClick={onBack}
        />

        {verified ? (
          <AuthButton label="Continue" type="button" onClick={onNext} />
        ) : codeSent ? (
          <AuthButton
            label={isSubmitting ? "Verifying..." : "Verify & Continue"}
            type="button"
            onClick={verifyCode}
            disabled={isSubmitting || otp.length !== 6}
          />
        ) : value.trim() ? (
          <AuthButton
            label={isSubmitting ? "Sending..." : "Send code"}
            type="button"
            onClick={sendCode}
            disabled={isSubmitting}
          />
        ) : (
          <AuthButton
            label="Skip for now"
            type="button"
            variant="secondary"
            onClick={onSkip}
          />
        )}
      </div>

      {verified ? (
        <button
          type="button"
          className="w-full text-center text-sm text-text-secondary hover:underline"
          onClick={useDifferentEmail}
        >
          Use a different school email
        </button>
      ) : (
        value.trim() && (
          <button
            type="button"
            className="w-full text-center text-sm text-text-secondary hover:underline"
            onClick={onSkip}
          >
            Skip this step
          </button>
        )
      )}
    </div>
  );
}
