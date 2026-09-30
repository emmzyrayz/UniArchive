// app/profile/[upid]/layout.tsx
// Page title for a public profile (the page itself is client-rendered).
import type { Metadata } from "next";
import { findPublicUser } from "@/lib/publicProfile";
import { createMetadata } from "@/lib/seo";

// Public profiles are shareable but kept out of search: they're students
export async function generateMetadata({
  params,
}: {
  params: Promise<{ upid: string }>;
}): Promise<Metadata> {
  const { upid } = await params;
  const path = `/profile/${encodeURIComponent(upid)}`;
  const user = await findPublicUser(upid).catch(() => null);
  if (!user) return createMetadata({ title: "Profile", path, noIndex: true });
  return createMetadata({
    title: `${user.fullName} (@${user.upid})`,
    description: `${user.fullName}'s verified contributions to the UniArchive UniLibrary.`,
    path,
    noIndex: true,
  });
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
