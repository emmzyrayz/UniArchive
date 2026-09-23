// components/auth/steps/StepPassword.tsx
"use client";

import { useState } from "react";
import AuthInput from "../UI/AuthInput";
import AuthButton from "../UI/AuthButton";
import type { SignUpFormData } from "../SignUpWizard";
import Link from "next/link";
import { isPasswordValid, PasswordRequirements } from "../UI/PasswordRequiremnets";

interface StepPasswordProps {
  password: string;
  confirmPassword: string;
  onChange: (field: keyof SignUpFormData, value: string) => void;
  onBack: () => void;
  /** Resolves to an error message to show, or null on success. */
  onSubmit: () => Promise<string | null>;
}


export function StepPassword({
  password,
  confirmPassword,
  onChange,
  onBack,
  onSubmit,
}: StepPasswordProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);


  const handlePasswordChange = (value: string) => {
    onChange("password", value);

    setErrors((prev) => ({
      ...prev,
      password: "",
      confirmPassword:
        confirmPassword && value !== confirmPassword
          ? "Passwords do not match."
          : "",
    }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    onChange("confirmPassword", value);

    setErrors((prev) => ({
      ...prev,
      confirmPassword: value !== password ? "Passwords do not match." : "",
    }));
  };
  
   const handleSubmit = async () => {
     const newErrors: Record<string, string> = {};

      if (!isPasswordValid(password)) {
        newErrors.password = "Please meet all password requirements above.";
      }
      if (confirmPassword !== password) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
      if (!agreedToTerms) {
        newErrors.terms = "You must agree to the Terms and Privacy Policy.";
      }

     setErrors(newErrors);
     if (Object.keys(newErrors).length > 0) return;

     setIsSubmitting(true);
     try {
       const submitError = await onSubmit();
       if (submitError) setErrors((prev) => ({ ...prev, submit: submitError }));
     } finally {
       setIsSubmitting(false);
     }
   };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">
          Secure your account
        </h2>
        <p className="text-sm text-text-secondary">
          Last step — set a strong password.
        </p>
      </div>

      <div className="space-y-3">
        <AuthInput
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          error={errors.password}
          required
        />
        <PasswordRequirements value={password} />
      </div>

      <AuthInput
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
        error={errors.confirmPassword}
        required
      />

      <div>
        <label className="flex items-start gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => {
              setAgreedToTerms(e.target.checked);
              if (e.target.checked) {
                setErrors((prev) => ({ ...prev, terms: "" }));
              }
            }}
            className="accent-primary rounded border-border mt-1"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && (
          <p className="text-sm text-error mt-1">{errors.terms}</p>
        )}
      </div>

      {errors.submit && (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error"
        >
          {errors.submit}
        </div>
      )}

      <div className="flex gap-3">
        <AuthButton
          label="Back"
          type="button"
          variant="secondary"
          onClick={onBack}
        />
        <AuthButton
          label={isSubmitting ? "Creating account..." : "Create Account"}
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
}
