// components/unilibrary/UploaderByline.tsx
// "@upid" linking to the uploader's profile, or "UniArchive" for platform
// materials (uploaded by staff or gifted), which credit nobody.
import Link from "next/link";

export function UploaderByline({ upid, isPlatform }: { upid: string; isPlatform?: boolean }) {
  if (isPlatform || !upid) {
    return <span className="font-medium text-text-secondary">UniArchive</span>;
  }
  return (
    <Link href={`/profile/${encodeURIComponent(upid)}`} className="text-primary hover:underline">
      @{upid}
    </Link>
  );
}
