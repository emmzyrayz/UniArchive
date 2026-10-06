// app/sitemap.ts -> /sitemap.xml
// Static pages plus every active UniLibrary material (/materials/<id>,
// server-rendered and indexable). Rebuilt at most hourly. If the database
// can't be reached the static pages are still listed. Past ~45,000
// materials, split it with generateSitemaps() (the limit is 50,000 URLs).
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { VERIFIED_MATERIALS, getMaterialModel } from "@/lib/models/materialModel";

export const revalidate = 3600;

type Entry = Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority">;

const STATIC_ROUTES: Record<string, Entry> = {
  "/": { changeFrequency: "weekly", priority: 1 },
  "/unilibrary": { changeFrequency: "daily", priority: 0.9 },
  "/about": { changeFrequency: "monthly", priority: 0.6 },
  "/help": { changeFrequency: "monthly", priority: 0.6 },
  "/contact": { changeFrequency: "yearly", priority: 0.4 },
  "/privacy": { changeFrequency: "yearly", priority: 0.2 },
  "/terms": { changeFrequency: "yearly", priority: 0.2 },
};

const MAX_MATERIALS = 45_000;

async function materialEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const Material = await getMaterialModel();
    // Unverified PDFs stay out of search engines until staff check them
    const docs = await Material.find({ isActive: true, ...VERIFIED_MATERIALS })
      .sort({ updatedAt: -1 })
      .limit(MAX_MATERIALS)
      .select("_id updatedAt")
      .lean<{ _id: unknown; updatedAt?: Date }[]>();
    return docs.map((d) => ({
      url: absoluteUrl(`/materials/${String(d._id)}`),
      ...(d.updatedAt && { lastModified: d.updatedAt }),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("[sitemap] couldn't list materials:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = Object.entries(STATIC_ROUTES).map(([path, entry]) => ({ url: absoluteUrl(path), ...entry }));
  return [...pages, ...(await materialEntries())];
}
