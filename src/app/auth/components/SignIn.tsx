"use client"
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthInput from "./UI/AuthInput";
import AuthButton from "./UI/AuthButton";
import BrandLogo from "./UI/BrandLogo";
import AuthSocial from "./UI/AuthSocial";
import { useState } from "react";
import { useUser } from "@/context/userContext";
import { errorMessage, postJson, signInWithGoogle } from "@/lib/authClient";
import { DeviceVerification } from "./DeviceVerification";
import { DeviceNoticeBanner } from "./DeviceNoticeBanner";

interface SignInInstanceProps {
  defaultEmail?: string;
  /** Set after email verification so the user gets a confirmation banner. */
  justVerified?: boolean;
  /** Where the proxy was sending the user before redirecting to sign-in. */
  from?: string;
  /** "forbidden" when the proxy rejected the user's role, or a Google sign-in error. */
  error?: string;
}

// Errors from Google sign-in: ours (socialAuth.ts, social-callback) and Auth.js's own
const OAUTH_ERRORS: Record<string, string> = {
  oauth_failed: "Google sign-in failed. Please try again.",
  oauth_unverified: "Your Google account's email isn't verified. Verify it with Google or sign in with email.",
  suspended: "This account has been suspended. Contact support if you think this is a mistake.",
  rate_limited: "Too many sign-in attempts. Please wait a minute and try again.",
  email_failed: "We couldn't send your verification email. Please try again shortly.",
  AccessDenied: "Google sign-in was cancelled or denied.",
  OAuthSignin: "Could not connect to Google. Please try again.",
  OAuthCallback: "Google sign-in was cancelled or failed.",
  Configuration: "Google sign-in is temporarily unavailable. Please use your email and password.",
};

function oauthErrorMessage(error: string | undefined): string | null {
  if (!error || error === "forbidden") return null;
  return OAUTH_ERRORS[error] ?? "Sign-in failed. Please try again or use your email and password.";
}

/**
 * Only same-site paths are allowed as a post-login destination: must start
 * with a single "/", no backslashes (browsers treat "/\" like "//"), and not
 * point back at the auth pages.
 */
function safeRedirectPath(from: string | undefined): string {
  if (
    !from ||
    !from.startsWith("/") ||
    from.startsWith("//") ||
    from.includes("\\") ||
    from === "/auth" ||
    from.startsWith("/auth?") ||
    from.startsWith("/auth/")
  ) {
    return "/home";
  }
  return from;
}

type LoginStatus =
  | { kind: "invalid" }
  | { kind: "unverified" }
  | { kind: "error"; message: string }
  | null;

export default function SignInInstance({
  defaultEmail,
  justVerified = false,
  from,
  error,
}: SignInInstanceProps) {
  const router = useRouter();
  const { refreshUserData } = useUser();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<LoginStatus>(null);
  const [socialNotice, setSocialNotice] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  // Set when the password was right but this device isn't trusted yet
  const [deviceCodeSentTo, setDeviceCodeSentTo] = useState<string | null>(null);
  const oauthError = oauthErrorMessage(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setStatus(null);
    try {
      const result = await postJson<{
        requiresVerification?: boolean;
        requiresDeviceVerification?: boolean;
        maskedEmail?: string;
      }>("/api/auth/login", { email: email.trim(), password });

      // 202: new device, a code was emailed; no session yet
      if (result.ok && result.data.requiresDeviceVerification) {
        setPassword("");
        setDeviceCodeSentTo(result.data.maskedEmail || "your email");
        return;
      }
      if (result.ok) {
        // The session cookie is set; load the user before leaving the page
        await refreshUserData({ force: true });
        router.push(safeRedirectPath(from));
        return;
      }
      if (result.status === 401) setStatus({ kind: "invalid" });
      else if (result.status === 403 && result.data.requiresVerification)
        setStatus({ kind: "unverified" });
      else setStatus({ kind: "error", message: errorMessage(result) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    setSocialNotice("Redirecting to Google...");
    signInWithGoogle(safeRedirectPath(from)).catch(() => {
      setIsRedirecting(false);
      setSocialNotice("Could not connect to Google. Please try again.");
    });
  };

  const handleVerifyNow = async () => {
    const trimmed = email.trim();
    await postJson("/api/auth/resend-verification", { email: trimmed });
    router.push(`/auth?view=verify&mode=signup&email=${encodeURIComponent(trimmed)}`);
  };

  if (deviceCodeSentTo) {
    return (
      <div className="space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl">
        <DeviceVerification
          maskedEmail={deviceCodeSentTo}
          defaultRedirect={safeRedirectPath(from)}
          secondaryAction={
            <button
              type="button"
              onClick={() => setDeviceCodeSentTo(null)}
              className="text-text-secondary hover:text-text-primary"
            >
              ← Back to sign in
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl">
      <div className="flex justify-between items-start">
        <BrandLogo size={48} />
        <div className="text-right">
          <p className="text-xl font-bold text-text-primary">UniArchive</p>
          <p className="text-sm text-text-secondary">Academic Management</p>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-text-primary">
          Welcome Back! <span className="text-xl">👋</span>
        </h1>
      </div>

      <DeviceNoticeBanner />

      {error === "forbidden" && !status && (
        <div
          role="alert"
          className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
        >
          You don&apos;t have permission to access that page. Sign in with an
          account that has the right role, or{" "}
          <Link href="/" className="font-semibold underline">
            go home
          </Link>
          .
        </div>
      )}

      {oauthError && !status && (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error"
        >
          {oauthError}
        </div>
      )}

      {justVerified && !status && (
        <div
          role="status"
          className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success"
        >
          Your email is verified. Sign in to continue.
        </div>
      )}

      {status && (
        <div
          role="alert"
          className={`rounded-md border p-3 text-sm ${
            status.kind === "unverified"
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-error/30 bg-error/10 text-error"
          }`}
        >
          {status.kind === "invalid" && "Incorrect email or password. Please try again."}
          {status.kind === "error" && status.message}
          {status.kind === "unverified" && (
            <>
              Please verify your email before signing in.{" "}
              <button
                type="button"
                onClick={handleVerifyNow}
                className="font-semibold underline"
              >
                Send a new code
              </button>
            </>
          )}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <AuthInput
      name="email"
      label="Email"
      type="email"
      autoComplete="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      disabled={!!defaultEmail} // still locked if prefilled from wizard redirect
      placeholder="example@email.com"
      required
    />
        <AuthInput
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary rounded border-neutral-300 dark:border-neutral-500"
            />
            Remember Me
          </label>
          <Link
            href="/auth?view=forgot-password"
            className="text-sm font-semibold text-text-primary hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <AuthButton
          label={isSubmitting ? "Signing in..." : "Sign In"}
          type="submit"
          disabled={isSubmitting}
        />
      </form>

      <div className="relative text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200 dark:border-neutral-700"></div>
        </div>
        <span className="relative bg-white dark:bg-neutral-800 px-3 text-sm text-text-muted">
          Or continue with
        </span>
      </div>

      <AuthSocial onGoogleClick={handleGoogleClick} />
      {socialNotice && (
        <p role="status" className="-mt-4 text-center text-sm text-text-secondary">
          {socialNotice}
        </p>
      )}

      <div className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth?view=signup"
          className="font-semibold text-text-primary hover:underline"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
