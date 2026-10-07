// components/reader/HighlightLayer.tsx
"use client";

import { useEffect, useState, useRef, type PointerEvent } from "react";
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

// How long "Add note" stays next to a new highlight
const NOTE_PROMPT_MS = 6000;

export function HighlightLayer({ pageNumber }: { pageNumber: number }) {
  const { highlights, highlightMode, activeHighlightColor, addHighlight, removeHighlight, showHighlightNote } =
    useReader();
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Box | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  // The highlight just made here, offered a note for a few seconds
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(null), NOTE_PROMPT_MS);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const pageHighlights = highlights.filter((h) => h.pageNumber === pageNumber);

  const getRelativePercent = (e: PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.min(Math.max(n, 0), 100);
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  };

  // Pointer events: mouse, pen and touch alike
  const handlePointerDown = (e: PointerEvent) => {
    if (!highlightMode) return;
    try {
      // Keep receiving the drag when it leaves the page
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer already ended (or isn't a real one): draw without capture
    }
    const point = getRelativePercent(e);
    startRef.current = point;
    setDraft({ x: point.x, y: point.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: PointerEvent) => {
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

  const handlePointerUp = (e: PointerEvent) => {
    const start = startRef.current;
    if (!highlightMode || !start) return;
    // From the release point, not the draft state: a quick drag can end
    // before the last move has re-rendered
    const end = getRelativePercent(e);
    const box = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      w: Math.abs(end.x - start.x),
      h: Math.abs(end.y - start.y),
    };
    if (box.w > 1 && box.h > 1 && containerRef.current) {
      const id = addHighlight({
        pageNumber,
        x: box.x,
        y: box.y,
        width: box.w,
        height: box.h,
        text: textUnder(containerRef.current, box),
        color: activeHighlightColor,
      });
      setJustAdded(id);
    }
    setDraft(null);
    startRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      // In highlight mode a drag draws instead of scrolling the page
      style={{ cursor: highlightMode ? "crosshair" : "default", touchAction: highlightMode ? "none" : "auto" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setDraft(null);
        startRef.current = null;
      }}
    >
      {pageHighlights.map((h) => (
        <div
          key={h.id}
          // In highlight mode a click removes it; otherwise clicks pass through
          className={`absolute border ${highlightMode ? "cursor-pointer hover:opacity-60" : "pointer-events-none"}`}
          title={highlightMode ? "Click to remove highlight" : undefined}
          onPointerDown={highlightMode ? (e) => e.stopPropagation() : undefined}
          onClick={highlightMode ? () => removeHighlight(h.id) : undefined}
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            width: `${h.width}%`,
            height: `${h.height}%`,
            backgroundColor: fill(h.color),
            borderColor: edge(h.color),
          }}
        >
          {(h.note || h.id === justAdded) && (
            <button
              type="button"
              // Above the page-turn overlay, and clickable outside highlight mode
              className={`pointer-events-auto absolute -top-3 right-0 z-20 translate-x-1/2 rounded-full border border-neutral-900/20 px-1.5 py-0.5 text-[11px] font-medium leading-none text-neutral-900 shadow ${
                h.note ? "" : "whitespace-nowrap"
              }`}
              style={{ backgroundColor: h.color }}
              title={h.note ? h.note : "Add a note to this highlight"}
              aria-label={h.note ? `Note: ${h.note}` : "Add a note to this highlight"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setJustAdded(null);
                showHighlightNote(h.id);
              }}
            >
              {h.note ? "📝" : "+ Note"}
            </button>
          )}
        </div>
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
