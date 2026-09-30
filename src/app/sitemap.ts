// app/sitemap.ts -> /sitemap.xml
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

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

export default function sitemap(): MetadataRoute.Sitemap {
  // TODO: add public UniLibrary material pages (/materials/<id>) once they
  // are server-rendered and indexable. They're noindex for now (see
  // src/app/materials/[id]/layout.tsx); list active verified materials here
  // with their updatedAt as lastModified, and use generateSitemaps() if the
  // count passes 50,000.
  return Object.entries(STATIC_ROUTES).map(([path, entry]) => ({
    url: absoluteUrl(path),
    ...entry,
  }));
}
