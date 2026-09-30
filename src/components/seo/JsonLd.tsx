// components/seo/JsonLd.tsx
// Organization + WebSite structured data, rendered once in the root layout.
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en-NG",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

// "<" escaped so no string in the data can close the <script> tag
const json = JSON.stringify(graph).replace(/</g, "\u003c");

export function JsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
