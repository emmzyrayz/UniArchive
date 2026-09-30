// components/seo/ogImage.tsx
// Shared 1200×630 social card for opengraph-image routes: the logo tile, a
// big title and a tagline on the dark brand background. Rendered at build
// time, so reading local files here is fine.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

interface OgImageOptions {
  title: string;
  tagline: string;
  /** Short line in the brand blue under the tagline. */
  footnote?: string;
}

export async function renderOgImage({ title, tagline, footnote }: OgImageOptions) {
  const [logo, soraBold, soraRegular] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png"), "base64"),
    readFile(join(process.cwd(), "src/app/fonts/Sora-Bold.ttf")),
    readFile(join(process.cwd(), "src/app/fonts/Sora-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 96px",
          background: BRAND.backgroundDark,
          fontFamily: "Sora",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
        <img
          src={`data:image/png;base64,${logo}`}
          width={260}
          height={260}
          alt=""
          style={{ borderRadius: 56 }}
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 104, fontWeight: 700, color: "#ffffff", lineHeight: 1.05 }}>
            {title}
          </div>
          <div style={{ marginTop: 20, fontSize: 42, color: BRAND.muted, lineHeight: 1.25 }}>
            {tagline}
          </div>
          {footnote && (
            <div style={{ marginTop: 36, fontSize: 30, color: BRAND.primary }}>{footnote}</div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Sora", data: soraBold, weight: 700, style: "normal" },
        { name: "Sora", data: soraRegular, weight: 400, style: "normal" },
      ],
    },
  );
}
