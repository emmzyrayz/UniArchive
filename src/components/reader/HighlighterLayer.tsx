// components/reader/HighlightLayer.tsx
"use client";

import { useState, useRef, type MouseEvent } from "react";
import { useReader } from "@/context/readerContext";
import { MAX_HIGHLIGHT_TEXT } from "@/lib/constants/annotations";

type Box = { x: number; y: number; w: number; h: number };

/**
 * The words pdf.js's text layer drew inside `box` (percentages of the
 * page), in reading order. Empty for scanned pages with no text layer.
 */
function textUnder(container: HTMLElement, box: Box): string {
  const page = container.getBoundingClientRect();
  const left = page.left + (box.x / 100) * page.width;
  const top = page.top + (box.y / 100) * page.height;
  const right = left + (box.w / 100) * page.width;
  const bottom = top + (box.h / 100) * page.height;

  const words: string[] = [];
  const spans = container.parentElement?.querySelectorAll<HTMLElement>(".textLayer span") ?? [];
  for (const span of spans) {
    const r = span.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx >= left && cx <= right && cy >= top && cy <= bottom && span.textContent) {
      words.push(span.textContent);
    }
  }
  return words.join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_HIGHLIGHT_TEXT);
}

// #RRGGBB plus alpha: a translucent fill and a slightly stronger border
const fill = (color: string) => `${color}4D`;
const edge = (color: string) => `${color}80`;

export function HighlightLayer({ pageNumber }: { pageNumber: number }) {
  const { highlights, highlightMode, addHighlight, removeHighlight } = useReader();
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Box | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const pageHighlights = highlights.filter((h) => h.pageNumber === pageNumber);

  const getRelativePercent = (e: MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.min(Math.max(n, 0), 100);
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!highlightMode) return;
    const point = getRelativePercent(e);
    startRef.current = point;
    setDraft({ x: point.x, y: point.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!highlightMode || !startRef.current) return;
    const point = getRelativePercent(e);
    const start = startRef.current;
    setDraft({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      w: Math.abs(point.x - start.x),
      h: Math.abs(point.y - start.y),
    });
  };

  const handleMouseUp = () => {
    if (!highlightMode || !draft) return;
    if (draft.w > 1 && draft.h > 1 && containerRef.current) {
      addHighlight({
        pageNumber,
        x: draft.x,
        y: draft.y,
        width: draft.w,
        height: draft.h,
        text: textUnder(containerRef.current, draft),
      });
    }
    setDraft(null);
    startRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: highlightMode ? "crosshair" : "default" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {pageHighlights.map((h) => (
        <div
          key={h.id}
          // In highlight mode a click removes it; otherwise clicks pass through
          className={`absolute border ${highlightMode ? "cursor-pointer hover:opacity-60" : "pointer-events-none"}`}
          title={highlightMode ? "Click to remove highlight" : undefined}
          onMouseDown={highlightMode ? (e) => e.stopPropagation() : undefined}
          onClick={highlightMode ? () => removeHighlight(h.id) : undefined}
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            width: `${h.width}%`,
            height: `${h.height}%`,
            backgroundColor: fill(h.color),
            borderColor: edge(h.color),
          }}
        />
      ))}
      {draft && (
        <div
          className="absolute bg-amber-300/20 border border-amber-400/40 pointer-events-none"
          style={{
            left: `${draft.x}%`,
            top: `${draft.y}%`,
            width: `${draft.w}%`,
            height: `${draft.h}%`,
          }}
        />
      )}
    </div>
  );
}
