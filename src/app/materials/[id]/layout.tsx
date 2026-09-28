// app/materials/[id]/layout.tsx
// Page title for a material's detail page (the page itself is client-rendered).
import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isValidObjectId(id)) return { title: "Material · UniArchive" };
  try {
    const Material = await getMaterialModel();
    const m = await Material.findOne({ _id: id, isActive: true })
      .select("title courseCode universityAbbr")
      .lean<{ title: string; courseCode?: string; universityAbbr?: string }>();
    if (!m) return { title: "Material · UniArchive" };
    const name = m.courseCode ? `${m.courseCode} — ${m.title}` : m.title;
    return {
      title: `${name} · UniLibrary`,
      description: `${name}${m.universityAbbr ? ` (${m.universityAbbr})` : ""} in the UniArchive UniLibrary.`,
    };
  } catch {
    return { title: "Material · UniArchive" };
  }
}

export default function MaterialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
