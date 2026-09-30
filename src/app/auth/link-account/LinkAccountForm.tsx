// app/auth/link-account/LinkAccountForm.tsx
"use client";

import { useState } from "react";
import { CodeConfirmForm } from "../components/CodeConfirmForm";
import { signInWithGoogle } from "@/lib/authClient";

export function LinkAccountForm({ requirePassword }: { requirePassword: boolean }) {
  const [switching, setSwitching] = useState(false);

  // Drop this pending link, then let the user pick another Google account
  const useDifferentAccount = async () => {
    setSwitching(true);
    await fetch("/api/auth/link-account", { method: "DELETE", credentials: "same-origin" }).catch(
      () => undefined,
    );
    await signInWithGoogle().catch(() => setSwitching(false));
  };

  return (
    <CodeConfirmForm
      verifyUrl="/api/auth/link-account"
      resendUrl="/api/auth/link-account/resend"
      submitLabel="Confirm & Link"
      requirePassword={requirePassword}
      secondaryAction={
        <button
          type="button"
          onClick={useDifferentAccount}
          disabled={switching}
          className="text-text-secondary hover:text-text-primary disabled:opacity-50"
        >
          {switching ? "Redirecting..." : "Use a different account"}
        </button>
      }
    />
  );
}
