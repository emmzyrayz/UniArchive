// app/unilibrary/layout.tsx
// Metadata for the (client-rendered) UniLibrary feed.
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.unilibrary;

export default function UniLibraryLayout({ children }: LayoutProps<"/unilibrary">) {
  return children;
}
