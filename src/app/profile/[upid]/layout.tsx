// app/profile/[upid]/layout.tsx
// Page title for a public profile (the page itself is client-rendered).
import type { Metadata } from "next";
import { findPublicUser } from "@/lib/publicProfile";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ upid: string }>;
}): Promise<Metadata> {
  const user = await findPublicUser((await params).upid).catch(() => null);
  if (!user) return { title: "Profile · UniArchive" };
  return {
    title: `${user.fullName} (@${user.upid}) · UniArchive`,
    description: `${user.fullName}'s verified contributions to the UniArchive UniLibrary.`,
  };
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
