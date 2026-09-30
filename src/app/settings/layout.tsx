// app/settings/layout.tsx
// Account settings: kept out of search (src/lib/seo.ts).
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Settings");

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
