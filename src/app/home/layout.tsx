// app/home/layout.tsx
// Signed-in home: kept out of search (src/lib/seo.ts).
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Home");

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
