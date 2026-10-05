// components/profile/ProfileHandle.tsx
// "@upid" linking to someone's public profile, or "a former member" once
// their account was deleted (its records keep the content with an empty
// upid; see lib/account/deletion.ts).
import Link from "next/link";

export const FORMER_MEMBER = "a former member";

export function ProfileHandle({ upid, className = "hover:underline" }: { upid?: string | null; className?: string }) {
  if (!upid) return <span className="italic">{FORMER_MEMBER}</span>;
  return (
    <Link href={`/profile/${encodeURIComponent(upid)}`} className={className}>
      @{upid}
    </Link>
  );
}
