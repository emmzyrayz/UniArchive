// components/auth/verify.tsx
// Two verification screens behind /auth?view=verify:
//   mode=signup  - confirm a new account's email (POST /api/auth/verify-email)
//   (default)    - password reset: typed code or magic link
//                  (POST /api/auth/verify-reset-code)
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OTPInput } from "./UI/AuthOTPInput";
import AuthButton from "./UI/AuthButton";
import BrandLogo from "./UI/BrandLogo";
import { StepVerifyEmail } from "./steps/StepVerifyEmail";
import { errorMessage, postJson, storeResetSession } from "@/lib/authClient";

const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyResetResponse {
  resetToken: string;
  email: string;
}

function Header() {
  return (
    <div className="flex justify-between items-start">
      <BrandLogo size={48} />
      <div className="text-right">
        <p className="text-xl font-bold text-text-primary">UniArchive</p>
        <p className="text-sm text-text-secondary">Academic Management</p>
      </div>
    </div>
  );
}

function SignupVerifyContent({ email }: { email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");

  if (!email) {
    return (
      <div className="space-y-6 bg-surface-raised p-8 rounded-xl border border-border shadow-sm">
        <Header />
        <p className="text-sm text-text-secondary">
          This verification link is missing an email address.{" "}
          <Link href="/auth?view=signup" className="font-semibold text-text-primary hover:underline">
            Start sign-up again
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-surface-raised p-8 rounded-xl border border-border shadow-sm">
      <Header />
      <StepVerifyEmail
        email={email}
        otp={otp}
        onChange={setOtp}
        onVerified={() =>
          router.push(`/auth?view=signin&verified=1&email=${encodeURIComponent(email)}`)
        }
        onBack={() => router.push("/auth?view=signup")}
      />
    </div>
  );
}

function ResetVerifyContent({
  email,
  magicToken,
}: {
  email: string;
  magicToken: string | null;
}) {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRedeemingLink, setIsRedeemingLink] = useState(!!magicToken);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Magic links are single-use; StrictMode runs effects twice in development,
  // so make sure the token is only redeemed once.
  const redeemedRef = useRef(false);

  // Magic-link path: redeem the token automatically on load, no code entry needed
  useEffect(() => {
    if (!magicToken || redeemedRef.current) return;
    redeemedRef.current = true;

    (async () => {
      const result = await postJson<VerifyResetResponse>(
        "/api/auth/verify-reset-code",
        { token: magicToken },
      );
      if (result.ok && result.data.resetToken) {
        storeResetSession(result.data.resetToken, result.data.email);
        // replace() keeps the single-use token out of the back-button history
        router.replace("/auth?view=reset-password");
      } else {
        setError(
          errorMessage(result, "This link is invalid or has expired. Please request a new one."),
        );
        setIsRedeemingLink(false);
      }
    })();
  }, [magicToken, router]);

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
    setNotice("");
    setIsVerifying(true);

    try {
      const result = await postJson<VerifyResetResponse>(
        "/api/auth/verify-reset-code",
        { email, code: otp },
      );
      if (result.ok && result.data.resetToken) {
        storeResetSession(result.data.resetToken, result.data.email);
        router.push("/auth?view=reset-password");
      } else {
        setError(errorMessage(result, "Invalid or expired code. Please try again."));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    startCooldown();
    setError("");
    setOtp("");
    const result = await postJson("/api/auth/request-reset", { email });
    setNotice(result.ok ? "A new code and link are on their way." : errorMessage(result));
  };

  // Magic-link path: show a lightweight "verifying..." state, no form at all
  if (magicToken) {
    return (
      <div className="space-y-8 bg-surface-raised p-8 rounded-xl border border-border shadow-sm text-center">
        <div className="flex justify-center">
          <BrandLogo size={48} />
        </div>
        {isRedeemingLink ? (
          <p className="text-text-secondary">Verifying your link...</p>
        ) : (
          <div className="space-y-3">
            <p className="text-error">{error}</p>
            <Link
              href="/auth?view=forgot-password"
              className="text-sm font-semibold text-text-primary hover:underline"
            >
              Request a new link
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-surface-raised p-8 rounded-xl border border-border shadow-sm">
      <Header />

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-text-primary">
          Check your inbox
        </h1>
        <p className="text-sm text-text-secondary">
          If an account exists for{" "}
          <span className="font-medium text-text-primary">
            {email || "your email"}
          </span>
          , we sent it a 6-digit code and a reset link. Enter the code below,
          or tap the link in the email.
        </p>
      </div>

      <OTPInput length={6} value={otp} onChange={setOtp} error={error} />

      {notice && (
        <p role="status" className="text-sm text-text-secondary">
          {notice}
        </p>
      )}

      <AuthButton
        label={isVerifying ? "Verifying..." : "Verify Code"}
        type="button"
        onClick={handleVerify}
        disabled={isVerifying || otp.length !== 6 || !email}
      />

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || !email}
          className="text-primary hover:underline disabled:text-text-muted disabled:no-underline disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  if (searchParams.get("mode") === "signup") {
    return <SignupVerifyContent email={email} />;
  }
  return <ResetVerifyContent email={email} magicToken={searchParams.get("token")} />;
}

export default function VerifyEmailInstance() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
