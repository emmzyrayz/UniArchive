// app/upload/layout.tsx
// Upload to your library: kept out of search (src/lib/seo.ts).
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Upload");

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
