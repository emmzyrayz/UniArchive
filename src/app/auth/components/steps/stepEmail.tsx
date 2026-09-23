// components/auth/steps/StepEmail.tsx
"use client";

import { useState } from "react";
import AuthInput from "../UI/AuthInput";
import AuthButton from "../UI/AuthButton";
import AuthSocial from "../UI/AuthSocial";
import type { Provider } from "../UI/AuthSocial";
import { useRouter } from "next/navigation";
import { errorMessage, postJson } from "@/lib/authClient";

interface StepEmailProps {
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
  onNext: () => void;
  onSocialAuth: (provider: Provider) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailCheckStatus = "new" | "existing" | "pending";

async function checkEmailStatus(
  email: string,
): Promise<{ status: EmailCheckStatus } | { error: string }> {
  const result = await postJson<{ status: EmailCheckStatus }>(
    "/api/auth/check-email",
    { email },
  );
  if (!result.ok || !result.data.status) return { error: errorMessage(result) };
  return { status: result.data.status };
}

export function StepEmail({
  value,
  locked,
  onChange,
  onNext,
  onSocialAuth,
}: StepEmailProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleContinue = async () => {
    if (!EMAIL_REGEX.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setIsChecking(true);

     try {
       const email = value.trim();
       const result = await checkEmailStatus(email);
       if ("error" in result) {
         setError(result.error);
         return;
       }

       switch (result.status) {
         case "existing":
           router.push(`/auth?view=signin&email=${encodeURIComponent(email)}`);
           break;
         case "pending":
           // Registered but never verified: send a fresh code and continue
           // at the verification screen instead of registering again.
           await postJson("/api/auth/resend-verification", { email });
           router.push(
             `/auth?view=verify&mode=signup&email=${encodeURIComponent(email)}`,
           );
           break;
         case "new":
         default:
           onNext();
           break;
       }
     } finally {
       setIsChecking(false);
     }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">
          What&apos;s your email?
        </h2>
        <p className="text-sm text-text-secondary">
          We&apos;ll check if you already have an account, or get you started.
        </p>
      </div>

      <AuthInput
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="youremail@mail.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        disabled={locked}
        required
      />

      <AuthButton
        label={isChecking ? "Checking..." : "Continue"}
        type="button"
        onClick={handleContinue}
        disabled={isChecking || !value}
      />

      <div className="relative text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200 dark:border-neutral-700"></div>
        </div>
        <span className="relative bg-white dark:bg-neutral-800 px-3 text-sm text-text-muted">
          Or continue with
        </span>
      </div>

      <AuthSocial onProviderClick={onSocialAuth} />
    </div>
  );
}
