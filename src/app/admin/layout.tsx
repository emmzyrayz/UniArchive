// app/admin/layout.tsx
// Admin and review tools: kept out of search. Pages set their own titles.
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Admin");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
