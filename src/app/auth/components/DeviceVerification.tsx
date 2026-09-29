// components/auth/DeviceVerification.tsx
// "New device detected": shown by SignIn when /api/auth/login answers 202,
// and by /auth/verify-device after Google sign-in from a new device.
"use client";

import type { ReactNode } from "react";
import { CodeConfirmForm } from "./CodeConfirmForm";

interface DeviceVerificationProps {
  maskedEmail: string;
  /** Where to go after signing in, if the server doesn't say. */
  defaultRedirect?: string;
  secondaryAction?: ReactNode;
}

export function DeviceVerification({
  maskedEmail,
  defaultRedirect,
  secondaryAction,
}: DeviceVerificationProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-text-primary">New device detected</h1>
        <p className="text-sm text-text-secondary">
          To keep your account safe, we sent a 6-digit code to{" "}
          <span className="font-medium text-text-primary">{maskedEmail}</span>. Enter it
          below to finish signing in. The code expires in 10 minutes.
        </p>
      </div>
      <CodeConfirmForm
        verifyUrl="/api/auth/verify-device"
        resendUrl="/api/auth/verify-device/resend"
        submitLabel="Verify & Sign In"
        defaultRedirect={defaultRedirect}
        secondaryAction={secondaryAction}
      />
    </div>
  );
}
