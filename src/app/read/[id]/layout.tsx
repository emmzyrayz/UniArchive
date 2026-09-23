// app/read/[id]/layout.tsx
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ReaderShell } from "@/components/reader/ReaderShell";
import type { Book } from "@/types/library";

// Origin for calling our own API from the server. Prefer the configured app
// URL over the request's Host header, which the client controls.
async function apiOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;

  const h = await headers();
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${h.get("host")}`;
}

export default async function ReadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookie = (await headers()).get("cookie") ?? "";

  const response = await fetch(
    `${await apiOrigin()}/api/books/${encodeURIComponent(id)}`,
    {
      // Forward the browser's session cookie so the API can check ownership
      headers: { cookie },
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    redirect("/auth?view=signin");
  }
  // 404 covers both "doesn't exist" and "not yours" (the API doesn't distinguish)
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    throw new Error(`Failed to load book ${id} (HTTP ${response.status})`);
  }

  const { book } = (await response.json()) as { book: Book };

  return <ReaderShell book={book}>{children}</ReaderShell>;
}
