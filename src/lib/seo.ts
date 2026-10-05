// src/lib/seo.ts
// One place for the site's URL, name and metadata. The canonical origin is
// https://uniarchive.com.ng (set NEXT_PUBLIC_APP_URL to it in Vercel); www
// and uni-archive.vercel.app redirect there in Vercel's domain settings. Never hardcode the site URL elsewhere: use SITE_URL/absoluteUrl.
//
// Metadata from nested segments is merged SHALLOWLY: a page that sets
// `openGraph` replaces the whole parent object, images included. So
// createMetadata() always returns complete openGraph/twitter/robots objects.
import type { Metadata, Viewport } from "next";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  // Set by Vercel on every deployment: the project's production domain
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

/** Absolute origin, no trailing slash. Use for links in emails and metadata. */
export const SITE_URL = resolveSiteUrl();

/** `absoluteUrl("/auth")` -> "https://uniarchive.com.ng/auth" */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = "UniArchive";
export const SITE_TAGLINE = "Your Academic Resource Hub";

const MAX_DESCRIPTION_LENGTH = 155;

/** Keeps descriptions within what search results show, cut at a word. */
export function truncateDescription(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
}

export const SITE_DESCRIPTION = truncateDescription(
  "PDF library and reader with highlights and bookmarks, plus UniLibrary: verified past questions, lecture notes and course materials for Nigerian students.",
);

// Brand colours, from src/app/globals.css
export const BRAND = {
  background: "#ffffff", // --color-neutral-0 (light --color-background)
  backgroundDark: "#09090b", // --color-neutral-950 (dark --color-background)
  logoTile: "#fafafa", // --color-neutral-50, the logo's own square
  ink: "#18181b", // --color-neutral-900
  muted: "#a1a1aa", // --color-neutral-400
  primary: "#1d9bf0", // --color-primary
} as const;

// src/app/opengraph-image.tsx renders this at build time. Pages pointing at
// it explicitly keep it through the shallow openGraph merge described above.
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
};

const INDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

const NO_INDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "education",
  keywords: [
    "past questions",
    "lecture notes",
    "course materials",
    "Nigerian universities",
    "PDF reader",
    "study app",
  ],
  // Images come from src/app/opengraph-image.tsx (Twitter falls back to it)
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: SITE_NAME,
    url: "/",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: INDEX_ROBOTS,
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const rootViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.background },
    { media: "(prefers-color-scheme: dark)", color: BRAND.backgroundDark },
  ],
};

export interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface CreateMetadataOptions {
  title: string;
  description?: string;
  /** Path of the page, e.g. "/about"; becomes the canonical URL. */
  path: string;
  /**
   * Defaults to the site-wide OG image. Pass `null` for a segment that has
   * its own opengraph-image file, so Next can attach that one instead.
   */
  image?: OgImage | null;
  noIndex?: boolean;
}

/** Complete per-page metadata; see the note on shallow merging at the top. */
export function createMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: CreateMetadataOptions): Metadata {
  const desc = truncateDescription(description);
  const fullTitle = `${title} | ${SITE_NAME}`;
  const images = image ? { images: [image] } : {};
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_NG",
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description: desc,
      ...images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      ...images,
    },
    robots: noIndex ? NO_INDEX_ROBOTS : INDEX_ROBOTS,
  };
}

/**
 * Signed-in and utility areas (a segment layout): a title and noindex. No
 * canonical, so nested pages don't all point at the layout's path; the root
 * Open Graph card is kept so shared links still show a UniArchive preview.
 */
export function privateMetadata(title: string): Metadata {
  return { title, robots: NO_INDEX_ROBOTS, alternates: { canonical: null } };
}

export const pageMetadata = {
  about: createMetadata({
    title: "About",
    path: "/about",
    description:
      "Why we're building UniArchive: one place for your study materials. See what works today and what's on the roadmap.",
  }),
  contact: createMetadata({
    title: "Contact",
    path: "/contact",
    description:
      "Questions, bug reports or ideas for UniArchive? Send us a message and we'll get back to you.",
  }),
  help: createMetadata({
    title: "Help Center",
    path: "/help",
    description:
      "Answers to common questions about UniArchive: signing up, uploading PDFs, your library, reading offline and the UniLibrary.",
  }),
  unilibrary: createMetadata({
    title: "UniLibrary",
    path: "/unilibrary",
    description:
      "Browse verified past questions, lecture notes and course materials from Nigerian universities. Filter by category, university and level.",
    // src/app/unilibrary/opengraph-image.tsx
    image: null,
  }),
  privacy: createMetadata({
    title: "Privacy Policy",
    path: "/privacy",
    description:
      "What UniArchive collects, how it's used and stored, and your choices. We don't sell your data or use advertising cookies.",
  }),
  terms: createMetadata({
    title: "Terms of Service",
    path: "/terms",
    description:
      "The rules for using UniArchive: who can use it, acceptable use, content you upload, and account termination.",
  }),
} satisfies Record<string, Metadata>;

/**
 * Kept out of robots.txt crawling. Public pages that live under these
 * prefixes need `$`/exact entries instead: "/profile/<upid>" is public, so
 * only "/profile" itself and "/profile/edit" are listed.
 */
export const PRIVATE_ROUTES = [
  "/home",
  "/dashboard",
  "/profile$",
  "/profile/edit",
  "/settings",
  "/upload",
  "/read/",
  "/submit",
  "/contribute",
  "/admin",
  "/mod$",
  "/mod/",
  "/auth",
  "/offline",
  "/api/",
] as const;
