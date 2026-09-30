// app/robots.ts -> /robots.txt
// Preview and development deployments on Vercel are never crawled.
import type { MetadataRoute } from "next";
import { PRIVATE_ROUTES, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_ROUTES] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
