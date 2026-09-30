// app/offline/layout.tsx
// Service-worker fallback page: kept out of search.
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Offline");

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
