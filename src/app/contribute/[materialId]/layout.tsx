// app/contribute/[materialId]/layout.tsx
// The conversion workspace: signed-in only, kept out of search (src/lib/seo.ts).
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Type out a material");

export default function ContributeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
