// components/auth/success.tsx
"use client";

import Link from "next/link";
import BrandLogo from "./UI/BrandLogo";
import AuthButton from "./UI/AuthButton";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MESSAGES: Record<string, { title: string; body: string }> = {
  "password-reset": {
    title: "Password reset!",
    body: "Your password has been updated. You can now sign in with your new password.",
  },
  registration: {
    title: "You're all set!",
    body: "Your account has been created successfully.",
  },
};

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = searchParams.get("kind") ?? "password-reset";
  const content = MESSAGES[kind] ?? MESSAGES["password-reset"];

  return (
    <div className="space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl text-center">
      <div className="flex justify-center">
        <BrandLogo size={48} />
      </div>

      <div className="space-y-2">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-extrabold text-text-primary">
          {content.title}
        </h1>
        <p className="text-sm text-text-secondary">{content.body}</p>
      </div>

      <AuthButton
        label="Continue to Sign In"
        type="button"
        onClick={() => router.push("/auth")}
      />
    </div>
  );
}

export default function SuccessInstance() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
