// app/materials/[id]/page.tsx
// A UniLibrary material's public page, rendered on the server so search
// engines (and slow phones) get the real content: title, course, school,
// description, outline and a preview of the typed questions and notes.
// Indexable, listed in the sitemap, with LearningResource + breadcrumb
// JSON-LD. Missing or taken-down materials are a real 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createMetadata, absoluteUrl, SITE_URL } from "@/lib/seo";
import { getMaterialDetail, getTypedPreview } from "@/lib/materialDetail";
import { levelLabel } from "@/components/unilibrary/materialLabels";
import { CATEGORIES } from "@/lib/constants/materialCategories";
import type { MaterialDetail } from "@/types/layer2";
import { MaterialView } from "./MaterialView";

type Props = { params: Promise<{ id: string }> };

function displayName(m: MaterialDetail): string {
  return m.courseCode ? `${m.courseCode}: ${m.title}` : m.title;
}

/** The full kind ("Past Question", "Lecture Notes"), not the badge's short label. */
function kindLabel(m: MaterialDetail): string {
  const category = CATEGORIES.find((c) => c.id === m.category);
  return category?.subcategories.find((s) => s.id === m.subcategory)?.label ?? category?.label ?? "Study material";
}

// Search snippets cut off around 160 characters: the facts people search
// by come first, the uploader's description last
function describe(m: MaterialDetail): string {
  const school = m.universityAbbr || m.universityName;
  const where = [school, m.level && levelLabel(m.level), m.academicYear].filter(Boolean).join(", ");
  const typed = [
    m.typedQuestionCount ? `${m.typedQuestionCount} typed questions` : "",
    m.typedNoteCount ? `${m.typedNoteCount} typed notes` : "",
  ].filter(Boolean);
  return [
    `${displayName(m)}: ${kindLabel(m)}${where ? ` (${where})` : ""}.`,
    typed.length ? `With ${typed.join(" and ")}.` : "",
    "Free on UniArchive.",
    m.description?.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const path = `/materials/${encodeURIComponent(id)}`;
  const m = await getMaterialDetail(id).catch(() => null);
  if (!m) return createMetadata({ title: "Material not found", path, noIndex: true });
  return createMetadata({ title: `${displayName(m)} · UniLibrary`, description: describe(m), path });
}

/** schema.org data: the material as a LearningResource, plus breadcrumbs. */
function MaterialJsonLd({ m }: { m: MaterialDetail & { updatedAt: string } }) {
  const url = absoluteUrl(`/materials/${m._id}`);
  const kind = kindLabel(m);
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": `${url}#resource`,
        name: displayName(m),
        description: describe(m),
        url,
        learningResourceType: kind,
        educationalLevel: m.level ? levelLabel(m.level) : undefined,
        inLanguage: m.language || "en",
        isAccessibleForFree: true,
        keywords: [m.courseCode, m.courseName, ...m.tags].filter(Boolean).join(", ") || undefined,
        datePublished: m.createdAt,
        dateModified: m.updatedAt,
        ...(m.courseCode && {
          about: { "@type": "Course", courseCode: m.courseCode, name: m.courseName || m.courseCode },
        }),
        ...((m.universityName || m.universityAbbr) && {
          sourceOrganization: { "@type": "CollegeOrUniversity", name: m.universityName || m.universityAbbr },
        }),
        ...(m.pageCount && { numberOfPages: m.pageCount }),
        publisher: { "@id": `${SITE_URL}/#organization` },
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "UniLibrary", item: absoluteUrl("/unilibrary") },
          { "@type": "ListItem", position: 2, name: displayName(m), item: url },
        ],
      },
    ],
  };
  // "<" escaped so no string in the data can close the <script> tag
  const json = JSON.stringify(graph).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export default async function MaterialPage({ params }: Props) {
  const { id } = await params;
  const material = await getMaterialDetail(id);
  if (!material) notFound();
  const preview = await getTypedPreview(material._id);
  return (
    <>
      <MaterialJsonLd m={material} />
      <MaterialView material={material} preview={preview} />
    </>
  );
}
