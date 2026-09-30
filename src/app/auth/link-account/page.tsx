// app/auth/link-account/page.tsx
// Confirms linking a Google account to an existing email/password account.
// The pending link comes from the httpOnly `ua_link` cookie set by
// /api/auth/social-callback; nothing identifying is in the URL.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthCard, ExpiredRequest } from "../components/AuthCard";
import { LinkAccountForm } from "./LinkAccountForm";
import { getPendingLinkModel } from "@/lib/models/pendingLinkModel";
import { LINK_COOKIE, readLinkToken } from "@/lib/auth/linkCookie";
import { hashToken } from "@/lib/auth/tokens";

export const metadata: Metadata = { title: "Link your Google account" };

async function loadPendingLink(rawToken: string | null) {
  if (!rawToken) return null;
  try {
    const PendingLink = await getPendingLinkModel();
    return await PendingLink.findOne({ linkTokenHash: hashToken(rawToken), used: false })
      .select("maskedEmail googleEmail googleName")
      .lean();
  } catch (error) {
    console.error("link-account page: failed to load pending link", error);
    return null;
  }
}

export default async function LinkAccountPage() {
  const cookieStore = await cookies();
  const pending = await loadPendingLink(readLinkToken(cookieStore.get(LINK_COOKIE)?.value));

  if (!pending) {
    return (
      <AuthCard>
        <ExpiredRequest
          title="This link request has expired"
          message="Link requests are valid for 15 minutes. Sign in with Google again to start over."
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-text-primary">
            Link Google to your UniArchive account
          </h1>
          <p className="text-sm text-text-secondary">
            We found an existing account with{" "}
            <span className="font-medium text-text-primary">{pending.maskedEmail}</span>.
          </p>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40 p-4 text-sm">
          <dt className="text-text-muted">Google account</dt>
          <dd className="font-medium text-text-primary break-all">{pending.googleEmail}</dd>
          {pending.googleName && (
            <>
              <dt className="text-text-muted">Google name</dt>
              <dd className="font-medium text-text-primary">{pending.googleName}</dd>
            </>
          )}
        </dl>

        <p className="text-sm text-text-secondary">
          To link these accounts, enter the 6-digit code we sent to your email. It expires in
          10 minutes.
        </p>

        <LinkAccountForm />
      </div>
    </AuthCard>
  );
}
