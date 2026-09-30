// app/settings/ConnectedAccounts.tsx
// Privacy tab: shows whether Google is linked and lets the user link it, or
// swap in a different Google account (confirmed by emailed code, plus the
// password when replacing one).
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/UI/Buttons";
import { GoogleIcon } from "@/app/auth/components/UI/SocialIcons";
import { connectGoogle } from "@/lib/authClient";

// ?google=... set by /api/auth/social-callback on the way back here
const RESULT_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  linked: { text: "Google account connected.", ok: true },
  connected: { text: "That Google account is already connected.", ok: true },
  google_in_use: {
    text: "That Google account is linked to a different UniArchive account.",
    ok: false,
  },
  rate_limited: { text: "Too many attempts. Please wait a minute and try again.", ok: false },
  email_failed: { text: "We couldn't send your confirmation code. Please try again.", ok: false },
  failed: { text: "Couldn't connect Google. Please try again.", ok: false },
};

interface Connections {
  google: boolean;
  password: boolean;
}

export function ConnectedAccounts({ result }: { result?: string }) {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const message = result ? RESULT_MESSAGES[result] : undefined;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/connections", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Connections | null) => {
        if (!cancelled && data) setConnections(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = () => {
    setError("");
    setRedirecting(true);
    connectGoogle().catch(() => {
      setRedirecting(false);
      setError("Could not connect to Google. Please try again.");
    });
  };

  const linked = connections?.google === true;

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-6">
      <h2 className="font-semibold text-text-primary mb-2">Connected accounts</h2>
      <p className="text-sm text-text-secondary mb-4">
        {linked
          ? "Signing in with a different Google account? Reconnect to switch to it. We'll email you a code" +
            (connections?.password ? " and ask for your password" : "") +
            " to confirm it's you."
          : "Link Google to sign in with one tap. We'll email you a code to confirm it's you."}
      </p>

      {message && (
        <p
          role="status"
          className={`mb-4 rounded-md border p-3 text-sm ${
            message.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-error/30 bg-error/10 text-error"
          }`}
        >
          {message.text}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <GoogleIcon className="h-6 w-6" />
          <div>
            <p className="text-sm font-medium text-text-primary">Google</p>
            <p className="text-xs text-text-muted">
              {connections === null ? "Checking..." : linked ? "Connected" : "Not connected"}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={handleConnect}
          disabled={connections === null || redirecting}
        >
          {redirecting ? "Redirecting..." : linked ? "Reconnect Google" : "Connect Google"}
        </Button>
      </div>
    </div>
  );
}
