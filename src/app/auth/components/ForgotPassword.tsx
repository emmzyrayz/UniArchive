// components/auth/ForgotPassword.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "./UI/AuthInput";
import AuthButton from "./UI/AuthButton";
import BrandLogo from "./UI/BrandLogo";
import { errorMessage, postJson } from "@/lib/authClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The server emails a 6-digit code and a single-use magic link, and responds
// the same way whether or not the account exists.
async function requestPasswordReset(email: string): Promise<string | null> {
  const result = await postJson("/api/auth/request-reset", { email });
  return result.ok ? null : errorMessage(result);
}

export default function ForgotPasswordInstance() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const trimmed = email.trim();
      const failure = await requestPasswordReset(trimmed);
      if (failure) {
        setError(failure);
        return;
      }
      router.push(`/auth?view=verify&email=${encodeURIComponent(trimmed)}`);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 bg-surface-raised p-8 rounded-xl border border-border shadow-sm">
      <div className="flex justify-between items-start">
        <BrandLogo size={48} />
        <div className="text-right">
          <p className="text-xl font-bold text-text-primary">UniArchive</p>
          <p className="text-sm text-text-secondary">Academic Management</p>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-text-primary">
          Forgot Password? <span className="text-xl">🤔</span>
        </h1>
        <p className="text-sm text-text-secondary">
          Enter your email and we&apos;ll send you a code and a link to reset
          it.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <AuthInput
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          required
        />

        <AuthButton
          label={isSubmitting ? "Sending..." : "Submit"}
          type="submit"
          disabled={isSubmitting}
        />
      </form>
    </div>
  );
}
