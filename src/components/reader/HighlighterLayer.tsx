// components/reader/HighlightLayer.tsx
"use client";

import { useState, useRef, type MouseEvent } from "react";
import { useReader } from "@/context/readerContext";

export function HighlightLayer({ pageNumber }: { pageNumber: number }) {
  const { highlights, highlightMode, addHighlight } = useReader();
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const pageHighlights = highlights.filter((h) => h.pageNumber === pageNumber);

  const getRelativePercent = (e: MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
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
    if (draft.w > 1 && draft.h > 1) {
      addHighlight({
        pageNumber,
        xPercent: draft.x,
        yPercent: draft.y,
        widthPercent: draft.w,
        heightPercent: draft.h,
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
          className="absolute bg-amber-300/30 border border-amber-400/50 pointer-events-none"
          style={{
            left: `${h.xPercent}%`,
            top: `${h.yPercent}%`,
            width: `${h.widthPercent}%`,
            height: `${h.heightPercent}%`,
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
