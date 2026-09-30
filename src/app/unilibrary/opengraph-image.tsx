// app/unilibrary/opengraph-image.tsx -> /unilibrary/opengraph-image
// pageMetadata.unilibrary passes image: null so this file's card is used.
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/components/seo/ogImage";

export const alt = "UniLibrary — verified past questions & notes on UniArchive";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function UniLibraryOpengraphImage() {
  return renderOgImage({
    title: "UniLibrary",
    tagline: "Verified past questions & notes",
    footnote: "From Nigerian universities, on UniArchive",
  });
}
