// app/profile/layout.tsx
// Profile pages are kept out of search, public ones (/profile/<upid>) included for now.
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Profile");

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
