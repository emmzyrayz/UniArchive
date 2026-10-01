// src/lib/pdfOutline.ts
// Reads a PDF's own bookmarks (its built-in outline) into outline entries,
// so a textbook's table of contents can be imported in one click and then
// tidied up. Client-side: takes the pdf.js document react-pdf has loaded.
//
// Bookmarks deeper than three levels are folded into level 3, entries whose
// destination can't be resolved get no page, and the list stops at the
// outline's entry limit.
import { OUTLINE_LIMITS, normalizeLevels, type OutlineEntry } from "@/lib/outline";

interface PdfOutlineNode {
  title: string;
  dest: string | unknown[] | null;
  items: PdfOutlineNode[];
}

/** The parts of pdf.js's PDFDocumentProxy this needs. */
export interface OutlineSource {
  getOutline(): Promise<PdfOutlineNode[] | null>;
  getDestination(id: string): Promise<unknown[] | null>;
  getPageIndex(ref: never): Promise<number>;
}

async function pageOf(pdf: OutlineSource, dest: PdfOutlineNode["dest"]): Promise<number | undefined> {
  try {
    const explicit = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
    if (!Array.isArray(explicit) || explicit.length === 0) return undefined;
    const target = explicit[0];
    // Either a page reference object or, in some PDFs, a 0-based page index
    const index = typeof target === "number" ? target : await pdf.getPageIndex(target as never);
    return Number.isInteger(index) && index >= 0 ? index + 1 : undefined;
  } catch {
    return undefined;
  }
}

/** The PDF's bookmarks as outline entries; empty when it has none. */
export async function extractPdfOutline(pdf: OutlineSource): Promise<OutlineEntry[]> {
  const roots = await pdf.getOutline().catch(() => null);
  if (!roots?.length) return [];

  const entries: OutlineEntry[] = [];
  const walk = async (nodes: PdfOutlineNode[], depth: number): Promise<void> => {
    for (const node of nodes) {
      if (entries.length >= OUTLINE_LIMITS.entries) return;
      const title = (node.title ?? "").replace(/\s+/g, " ").trim().slice(0, OUTLINE_LIMITS.title);
      if (title) {
        const page = await pageOf(pdf, node.dest);
        entries.push({ title, level: Math.min(depth, 3) as 1 | 2 | 3, ...(page ? { page } : {}) });
      }
      if (node.items?.length) await walk(node.items, depth + 1);
    }
  };
  await walk(roots, 1);
  // An untitled bookmark's children would otherwise skip a level
  return normalizeLevels(entries);
}
