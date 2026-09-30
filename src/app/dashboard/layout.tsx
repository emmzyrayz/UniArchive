// app/dashboard/layout.tsx
// Signed-in dashboard: kept out of search (src/lib/seo.ts).
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Dashboard");

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
