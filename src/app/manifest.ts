// app/manifest.ts -> /manifest.webmanifest (Next links it automatically).
// The service worker comes from @ducanh2912/next-pwa (next.config.ts), which
// doesn't write a manifest of its own. Icons: pnpm icons (scripts/generate-icons.ts).
import type { MetadataRoute } from "next";
import { BRAND, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND.background,
    theme_color: BRAND.background,
    categories: ["education", "books", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
