// components/reader/BlockRenderer.tsx
// Read-only rendering of ContentBlocks. All HTML is sanitised with DOMPurify
// and LaTeX is rendered with KaTeX; both happen after mount (browser only).
"use client";

import "katex/dist/katex.min.css";
import type { ContentBlock } from "@/types/content";
import { isSafeImageUrl, renderLatex, sanitizeHtml } from "@/lib/sanitize";
import { useIsClient } from "@/hooks/useIsClient";

interface BlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

function BlockView({ block, isClient }: { block: ContentBlock; isClient: boolean }) {
  switch (block.type) {
    case "title":
      return (
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {block.content}
        </h2>
      );

    case "subtitle":
      return (
        <h3 className="text-lg sm:text-xl font-semibold text-text-primary">
          {block.content}
        </h3>
      );

    case "richText":
      return (
        <div
          className="text-text-secondary leading-relaxed space-y-3 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6"
          dangerouslySetInnerHTML={{
            __html: isClient ? sanitizeHtml(block.content) : "",
          }}
        />
      );

    case "formula":
      // A formula block sits on its own line, so it always renders in display mode.
      return (
        <figure className="my-2">
          <div
            className="overflow-x-auto py-2 text-text-primary flex justify-center"
            role="math"
            aria-label={block.description || block.content}
            dangerouslySetInnerHTML={{
              __html: isClient ? renderLatex(block.content, true) : "",
            }}
          />
          {block.description && block.description !== block.content && (
            <figcaption className="text-center text-xs text-text-muted">
              {block.description}
            </figcaption>
          )}
        </figure>
      );

    case "image":
      if (!isSafeImageUrl(block.content)) return null;
      return (
        <figure className="my-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts */}
          <img
            src={block.content}
            alt={block.imageDescription || block.description || ""}
            loading="lazy"
            className="mx-auto max-h-[480px] rounded-lg border border-border"
          />
          {block.imageDescription && (
            <figcaption className="mt-1 text-center text-xs text-text-muted">
              {block.imageDescription}
            </figcaption>
          )}
        </figure>
      );

    default:
      return null;
  }
}

export function BlockRenderer({ blocks, className = "" }: BlockRendererProps) {
  const isClient = useIsClient();

  if (blocks.length === 0) {
    return (
      <p className={`text-sm text-text-muted ${className}`}>
        No content has been added yet.
      </p>
    );
  }

  return (
    <article className={`space-y-4 ${className}`}>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} isClient={isClient} />
      ))}
    </article>
  );
}
