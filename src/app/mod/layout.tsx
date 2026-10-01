// app/mod/layout.tsx
// Moderation tools for moderators (auditor, course_rep, lecturer, ed_admin)
// and admins; see src/proxy.ts. The pages are the same shared pages as
// /admin (src/app/_staff). Kept out of search.
import { privateMetadata } from "@/lib/seo";
import { StaffAreaProvider } from "@/components/admin/staffArea";

export const metadata = privateMetadata("Moderation");

export default function ModLayout({ children }: { children: React.ReactNode }) {
  return <StaffAreaProvider area="mod">{children}</StaffAreaProvider>;
}
