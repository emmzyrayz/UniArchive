// src/lib/sanitize.ts
// Browser-only HTML sanitising and LaTeX rendering. Both return "" on the
// server (DOMPurify needs a DOM), so render their output only after mount
// (see hooks/useIsClient).
import DOMPurify from "dompurify";
import katex from "katex";

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/** Renders LaTeX with KaTeX, then sanitises the result. */
export function renderLatex(latex: string, displayMode = false): string {
  if (typeof window === "undefined" || !latex.trim()) return "";
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode,
    trust: false,
    strict: "ignore",
    output: "html",
  });
  return DOMPurify.sanitize(html);
}

/** Only absolute http(s) URLs are allowed as image sources. */
export function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
