// app/admin/layout.tsx
// Platform admin tools (com_admin, webmaster, dev; see src/proxy.ts). Kept
// out of search. Pages set their own titles.
import { privateMetadata } from "@/lib/seo";
import { StaffAreaProvider } from "@/components/admin/staffArea";

export const metadata = privateMetadata("Admin");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <StaffAreaProvider area="admin">{children}</StaffAreaProvider>;
}
