// components/unilibrary/UploaderByline.tsx
// "@upid" linking to the uploader's profile, "UniArchive" for platform
// materials (uploaded by staff or gifted), which credit nobody, or "a former
// member" when the uploader deleted their account.
import { ProfileHandle } from "@/components/profile/ProfileHandle";

export function UploaderByline({ upid, isPlatform }: { upid: string; isPlatform?: boolean }) {
  if (isPlatform) {
    return <span className="font-medium text-text-secondary">UniArchive</span>;
  }
  return <ProfileHandle upid={upid} className="text-primary hover:underline" />;
}
