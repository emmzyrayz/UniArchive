// app/opengraph-image.tsx -> /opengraph-image
// The site-wide social card. Twitter uses it too: with no twitter-image
// file, Next copies openGraph.images into twitter:image. Pages built with
// createMetadata() point at this route explicitly (src/lib/seo.ts).
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/components/seo/ogImage";

export const alt = DEFAULT_OG_IMAGE.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOgImage({
    title: SITE_NAME,
    tagline: SITE_TAGLINE,
    footnote: "Past questions · Lecture notes · PDF reader",
  });
}
