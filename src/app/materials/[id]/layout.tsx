// app/materials/[id]/layout.tsx
// Page title for a material's detail page (the page itself is client-rendered).
import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import { createMetadata } from "@/lib/seo";

// Public, but noindex until material pages are server-rendered and listed in
// the sitemap (see the TODO in src/app/sitemap.ts)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const path = `/materials/${encodeURIComponent(id)}`;
  const fallback = createMetadata({ title: "Material", path, noIndex: true });
  if (!isValidObjectId(id)) return fallback;
  try {
    const Material = await getMaterialModel();
    const m = await Material.findOne({ _id: id, isActive: true })
      .select("title courseCode universityAbbr")
      .lean<{ title: string; courseCode?: string; universityAbbr?: string }>();
    if (!m) return fallback;
    const name = m.courseCode ? `${m.courseCode} — ${m.title}` : m.title;
    return createMetadata({
      title: `${name} · UniLibrary`,
      description: `${name}${m.universityAbbr ? ` (${m.universityAbbr})` : ""} in the UniArchive UniLibrary.`,
      path,
      noIndex: true,
    });
  } catch {
    return fallback;
  }
}

export default function MaterialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
