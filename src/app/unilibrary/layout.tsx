// app/unilibrary/layout.tsx
// Metadata for the (client-rendered) UniLibrary feed.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UniLibrary — UniArchive",
  description: "Browse verified academic materials from Nigerian universities",
};

export default function UniLibraryLayout({ children }: LayoutProps<"/unilibrary">) {
  return children;
}
