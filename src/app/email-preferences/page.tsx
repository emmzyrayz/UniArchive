// app/email-preferences/page.tsx
// The personal "manage email preferences" link in every broadcast
// (?u=<upid>&t=<token>, lib/emailPrefs.ts). Works without signing in; a
// wrong or missing token shows the same "link isn't valid" message as an
// unknown account.
import Link from "next/link";
import type { Types } from "mongoose";
import { privateMetadata } from "@/lib/seo";
import { getUserModel } from "@/lib/models/userModel";
import { effectiveEmailPrefs, isValidEmailPrefsToken, type EmailPrefs } from "@/lib/emailPrefs";
import { EmailPrefsLinkForm } from "./EmailPrefsLinkForm";

export const metadata = privateMetadata("Email preferences");

const UPID_PATTERN = /^[a-z0-9]{1,60}$/i;

export default async function EmailPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string | string[]; t?: string | string[] }>;
}) {
  const { u, t } = await searchParams;
  const upid = typeof u === "string" && UPID_PATTERN.test(u) ? u : null;
  const token = typeof t === "string" ? t : "";

  let user: { _id: Types.ObjectId; firstName?: string; fullName: string; emailPrefs?: Partial<EmailPrefs> } | null = null;
  if (upid) {
    const User = await getUserModel();
    const found = await User.findOne({ upid })
      .select("firstName fullName emailPrefs")
      .lean<{ _id: Types.ObjectId; firstName?: string; fullName: string; emailPrefs?: Partial<EmailPrefs> }>();
    if (found && isValidEmailPrefsToken(found._id, token)) user = found;
  }

  return (
    <div className="mt-[70px] min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface-raised p-6">
        <h1 className="text-xl font-bold text-text-primary">Email preferences</h1>
        {user && upid ? (
          <>
            <p className="mb-6 mt-1 text-sm text-text-secondary">
              Hi {user.firstName || user.fullName.split(/\s+/)[0]}, choose which updates UniArchive emails you.
              Account emails, like sign-in codes, always arrive.
            </p>
            <EmailPrefsLinkForm upid={upid} token={token} initial={effectiveEmailPrefs(user.emailPrefs)} />
          </>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">
            This link isn&apos;t valid. Use the link from your latest UniArchive email, or{" "}
            <Link href="/settings?tab=notifications" className="font-medium text-primary hover:underline">
              sign in and open Settings
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
