// app/submit/layout.tsx
// UniLibrary submission form: kept out of search (src/lib/seo.ts).
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Submit to UniLibrary");

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
