// components/editor/BlockEditor.tsx
// Block-based content editor (title, subtitle, rich text, formula, image) with
// drag-to-reorder and a preview mode. The parent owns saving; this component
// reports every change through onContentChange.
//
// Rich text is plain HTML in a textarea for now (sanitised when rendered);
// images are URLs until presigned image upload exists.
"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/UI/Buttons";
import { FormulaModal } from "@/components/editor/FormulaModal";
import { BlockRenderer } from "@/components/reader/BlockRenderer";
import { isSafeImageUrl, renderLatex } from "@/lib/sanitize";
import { useIsClient } from "@/hooks/useIsClient";
import type { ContentBlock, ContentBlockType } from "@/types/content";

export type { ContentBlock } from "@/types/content";

interface BlockEditorProps {
  initialBlocks?: ContentBlock[];
  onContentChange?: (blocks: ContentBlock[]) => void;
}

const BLOCK_LABELS: Record<ContentBlockType, string> = {
  title: "Title",
  subtitle: "Subtitle",
  richText: "Text",
  formula: "Formula",
  image: "Image",
};

const inputClass =
  "w-full px-3 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-primary";

function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="cursor-grab touch-none rounded p-1 text-text-muted hover:text-text-primary active:cursor-grabbing"
      {...props}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
      </svg>
    </button>
  );
}

interface SortableBlockProps {
  block: ContentBlock;
  isClient: boolean;
  onChange: (id: string, patch: Partial<ContentBlock>) => void;
  onRemove: (id: string) => void;
  onEditFormula: (id: string) => void;
}

function SortableBlock({ block, isClient, onChange, onRemove, onEditFormula }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-surface p-3 sm:p-4 ${
        isDragging ? "border-accent shadow-lg" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
          <DragHandle {...attributes} {...listeners} />
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {BLOCK_LABELS[block.type]}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(block.id)}
          className="text-sm text-text-secondary hover:text-error"
        >
          Remove
        </button>
      </div>

      {(block.type === "title" || block.type === "subtitle") && (
        <input
          type="text"
          aria-label={BLOCK_LABELS[block.type]}
          value={block.content}
          onChange={(e) => onChange(block.id, { content: e.target.value })}
          placeholder={block.type === "title" ? "Section title" : "Subtitle"}
          className={`${inputClass} ${block.type === "title" ? "text-lg font-bold" : "font-semibold"}`}
        />
      )}

      {block.type === "richText" && (
        <textarea
          aria-label="Text"
          rows={5}
          value={block.content}
          onChange={(e) => onChange(block.id, { content: e.target.value })}
          placeholder="Write your text. Basic HTML such as <b>, <i>, <ul> and <a> is supported."
          className={`${inputClass} resize-y`}
        />
      )}

      {block.type === "formula" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            className="flex-1 min-h-12 overflow-x-auto rounded-md border border-border bg-background p-3 text-text-primary"
            dangerouslySetInnerHTML={{
              __html: isClient && block.content ? renderLatex(block.content, true) : "",
            }}
          />
          <Button variant="secondary" onClick={() => onEditFormula(block.id)}>
            {block.content ? "Edit formula" : "Add formula"}
          </Button>
        </div>
      )}

      {block.type === "image" && (
        <div className="space-y-2">
          <input
            type="url"
            aria-label="Image URL"
            value={block.content}
            onChange={(e) => onChange(block.id, { content: e.target.value.trim() })}
            placeholder="https://example.com/diagram.png"
            className={inputClass}
          />
          {block.content && !isSafeImageUrl(block.content) && (
            <p className="text-xs text-error">Enter a full http(s) URL.</p>
          )}
          <input
            type="text"
            aria-label="Image description"
            value={block.imageDescription ?? ""}
            onChange={(e) => onChange(block.id, { imageDescription: e.target.value })}
            placeholder="Describe the image (used as alt text)"
            className={inputClass}
          />
          {isSafeImageUrl(block.content) && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts
            <img
              src={block.content}
              alt={block.imageDescription || ""}
              className="max-h-48 rounded-md border border-border"
            />
          )}
        </div>
      )}
    </li>
  );
}

export function BlockEditor({ initialBlocks = [], onContentChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [previewMode, setPreviewMode] = useState(false);
  const [formulaTarget, setFormulaTarget] = useState<string | "new" | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const isClient = useIsClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = (next: ContentBlock[]) => {
    setBlocks(next);
    onContentChange?.(next);
  };

  const addBlock = (type: ContentBlockType) => {
    if (type === "formula") {
      setFormulaTarget("new");
      return;
    }
    commit([
      ...blocks,
      {
        id: crypto.randomUUID(),
        type,
        content: "",
        ...(type === "image" ? { imageDescription: "" } : {}),
      },
    ]);
  };

  const updateBlock = (id: string, patch: Partial<ContentBlock>) =>
    commit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const removeBlock = (id: string) => commit(blocks.filter((b) => b.id !== id));

  const handleFormulaInsert = (formula: string, description?: string) => {
    if (formulaTarget === "new") {
      commit([
        ...blocks,
        { id: crypto.randomUUID(), type: "formula", content: formula, description },
      ]);
    } else if (formulaTarget) {
      updateBlock(formulaTarget, { content: formula, description });
    }
    setFormulaTarget(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from !== -1 && to !== -1) commit(arrayMove(blocks, from, to));
  };

  const editingBlock =
    formulaTarget && formulaTarget !== "new"
      ? blocks.find((b) => b.id === formulaTarget)
      : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!previewMode && (
          <div className="flex flex-wrap gap-2" aria-label="Add block">
            {(Object.keys(BLOCK_LABELS) as ContentBlockType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
              >
                + {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {!previewMode && blocks.length > 0 &&
            (confirmClear ? (
              <>
                <span className="text-sm text-text-secondary">Clear everything?</span>
                <button
                  type="button"
                  onClick={() => {
                    commit([]);
                    setConfirmClear(false);
                  }}
                  className="text-sm font-medium text-error"
                >
                  Yes, clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="text-sm text-text-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="text-sm text-text-secondary hover:text-error"
              >
                Clear all
              </button>
            ))}
          <button
            type="button"
            aria-pressed={previewMode}
            onClick={() => setPreviewMode((p) => !p)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
          >
            {previewMode ? "Edit" : "Preview"}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="rounded-xl border border-border bg-surface-raised p-4 sm:p-6">
          <BlockRenderer blocks={blocks} />
        </div>
      ) : blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-sm text-text-muted">
          No content yet. Add a block using the buttons above.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isClient={isClient}
                  onChange={updateBlock}
                  onRemove={removeBlock}
                  onEditFormula={setFormulaTarget}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <p className="text-xs text-text-muted">{blocks.length} block{blocks.length === 1 ? "" : "s"}</p>

      {formulaTarget && (
        <FormulaModal
          onClose={() => setFormulaTarget(null)}
          onInsert={handleFormulaInsert}
          initialFormula={editingBlock?.content}
          initialDescription={
            editingBlock?.description !== editingBlock?.content
              ? editingBlock?.description
              : undefined
          }
        />
      )}
    </div>
  );
}
