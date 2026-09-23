// components/courses/OutlineEditor.tsx
// Structures a course into weeks -> topics -> subtopics. Weeks, and topics
// within a week, can be reordered by dragging. Ids stay stable when items are
// moved or removed (only week `index` is renumbered), so they are safe to
// reference from Topic documents later. Topic content is edited elsewhere.
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
import type {
  CourseOutlineTopic,
  CourseOutlineWeek,
} from "@/lib/models/courseModel";

interface OutlineEditorProps {
  initialOutline?: CourseOutlineWeek[];
  onSave: (outline: CourseOutlineWeek[]) => void;
  onChange?: (outline: CourseOutlineWeek[]) => void;
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const emptyTopic = (): CourseOutlineTopic => ({ id: newId("topic"), name: "", subtopics: [] });

const emptyWeek = (index: number): CourseOutlineWeek => ({
  weekId: newId("week"),
  index,
  topics: [emptyTopic()],
});

/**
 * Ensures every week/topic/subtopic has an id and that ids are unique across
 * the whole outline (duplicates and blanks get fresh ids).
 */
export function normaliseOutline(outline: CourseOutlineWeek[] = []): CourseOutlineWeek[] {
  const seen = new Set<string>();
  const unique = (id: string | undefined, prefix: string) => {
    if (id && !seen.has(id)) {
      seen.add(id);
      return id;
    }
    let fresh = newId(prefix);
    while (seen.has(fresh)) fresh = newId(prefix);
    seen.add(fresh);
    return fresh;
  };

  const weeks = outline.map((week, weekIdx) => ({
    weekId: unique(week.weekId, "week"),
    index: weekIdx + 1,
    topics: (week.topics?.length ? week.topics : [emptyTopic()]).map((topic) => ({
      id: unique(topic.id, "topic"),
      name: topic.name ?? "",
      subtopics: (topic.subtopics ?? []).map((sub) => ({
        id: unique(sub.id, "subtopic"),
        name: sub.name ?? "",
      })),
    })),
  }));

  return weeks.length ? weeks : [emptyWeek(1)];
}

/** Drops blank topics/subtopics and empty weeks, then renumbers weeks. */
function cleanOutline(outline: CourseOutlineWeek[]): CourseOutlineWeek[] {
  return outline
    .map((week) => ({
      ...week,
      topics: week.topics
        .filter((t) => t.name.trim())
        .map((t) => ({
          id: t.id,
          name: t.name.trim(),
          subtopics: t.subtopics
            .filter((s) => s.name.trim())
            .map((s) => ({ id: s.id, name: s.name.trim() })),
        })),
    }))
    .filter((week) => week.topics.length > 0)
    .map((week, i) => ({ ...week, index: i + 1 }));
}

const inputClass =
  "w-full px-3 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-primary";

function DragHandle(props: React.HTMLAttributes<HTMLButtonElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <button
      type="button"
      aria-label={label}
      className="cursor-grab touch-none rounded p-1 text-text-muted hover:text-text-primary active:cursor-grabbing"
      {...rest}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
      </svg>
    </button>
  );
}

function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

interface TopicRowProps {
  topic: CourseOutlineTopic;
  topicNumber: string;
  canRemove: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAddSubtopic: () => void;
  onRenameSubtopic: (subId: string, name: string) => void;
  onRemoveSubtopic: (subId: string) => void;
}

function SortableTopic({
  topic,
  topicNumber,
  canRemove,
  onRename,
  onRemove,
  onAddSubtopic,
  onRenameSubtopic,
  onRemoveSubtopic,
}: TopicRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-md border bg-background p-3 ${isDragging ? "border-accent shadow-md relative z-10" : "border-border"}`}
    >
      <div className="flex items-center gap-2">
        <DragHandle label={`Reorder topic ${topicNumber}`} {...attributes} {...listeners} />
        <span className="text-xs font-medium text-text-muted w-8 shrink-0">{topicNumber}</span>
        <input
          type="text"
          aria-label={`Topic ${topicNumber}`}
          value={topic.name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Topic name"
          className={inputClass}
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove topic ${topicNumber}`}
            className="shrink-0 text-sm text-text-secondary hover:text-error"
          >
            Remove
          </button>
        )}
      </div>

      <ul className="mt-2 space-y-2 pl-10 sm:pl-14">
        {topic.subtopics.map((sub, subIdx) => (
          <li key={sub.id} className="flex items-center gap-2">
            <span className="text-xs text-text-muted w-10 shrink-0">
              {topicNumber}.{subIdx + 1}
            </span>
            <input
              type="text"
              aria-label={`Subtopic ${topicNumber}.${subIdx + 1}`}
              value={sub.name}
              onChange={(e) => onRenameSubtopic(sub.id, e.target.value)}
              placeholder="Subtopic name"
              className={`${inputClass} text-sm`}
            />
            <button
              type="button"
              onClick={() => onRemoveSubtopic(sub.id)}
              aria-label={`Remove subtopic ${topicNumber}.${subIdx + 1}`}
              className="shrink-0 text-sm text-text-secondary hover:text-error"
            >
              ×
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onAddSubtopic}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            + Add subtopic
          </button>
        </li>
      </ul>
    </li>
  );
}

interface WeekCardProps {
  week: CourseOutlineWeek;
  canRemove: boolean;
  onChange: (week: CourseOutlineWeek) => void;
  onRemove: () => void;
}

function SortableWeek({ week, canRemove, onChange, onRemove }: WeekCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: week.weekId });
  const sensors = useDragSensors();

  const setTopics = (topics: CourseOutlineTopic[]) => onChange({ ...week, topics });
  const updateTopic = (topicId: string, patch: (t: CourseOutlineTopic) => CourseOutlineTopic) =>
    setTopics(week.topics.map((t) => (t.id === topicId ? patch(t) : t)));

  const handleTopicDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = week.topics.findIndex((t) => t.id === active.id);
    const to = week.topics.findIndex((t) => t.id === over.id);
    if (from !== -1 && to !== -1) setTopics(arrayMove(week.topics, from, to));
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-surface p-4 ${isDragging ? "border-accent shadow-lg relative z-20" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <DragHandle label={`Reorder week ${week.index}`} {...attributes} {...listeners} />
          <h3 className="font-semibold text-text-primary">Week {week.index}</h3>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-text-secondary hover:text-error"
          >
            Remove week
          </button>
        )}
      </div>

      {/* Nested context: topics reorder within their own week only */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopicDragEnd}>
        <SortableContext items={week.topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {week.topics.map((topic, topicIdx) => (
              <SortableTopic
                key={topic.id}
                topic={topic}
                topicNumber={`${week.index}.${topicIdx + 1}`}
                canRemove={week.topics.length > 1}
                onRename={(name) => updateTopic(topic.id, (t) => ({ ...t, name }))}
                onRemove={() => setTopics(week.topics.filter((t) => t.id !== topic.id))}
                onAddSubtopic={() =>
                  updateTopic(topic.id, (t) => ({
                    ...t,
                    subtopics: [...t.subtopics, { id: newId("subtopic"), name: "" }],
                  }))
                }
                onRenameSubtopic={(subId, name) =>
                  updateTopic(topic.id, (t) => ({
                    ...t,
                    subtopics: t.subtopics.map((s) => (s.id === subId ? { ...s, name } : s)),
                  }))
                }
                onRemoveSubtopic={(subId) =>
                  updateTopic(topic.id, (t) => ({
                    ...t,
                    subtopics: t.subtopics.filter((s) => s.id !== subId),
                  }))
                }
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => setTopics([...week.topics, emptyTopic()])}
        className="mt-3 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        + Add topic
      </button>
    </li>
  );
}

export function OutlineEditor({ initialOutline, onSave, onChange }: OutlineEditorProps) {
  const [weeks, setWeeks] = useState<CourseOutlineWeek[]>(() => normaliseOutline(initialOutline));
  const sensors = useDragSensors();

  const commit = (next: CourseOutlineWeek[]) => {
    const renumbered = next.map((w, i) => ({ ...w, index: i + 1 }));
    setWeeks(renumbered);
    onChange?.(renumbered);
  };

  const handleWeekDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = weeks.findIndex((w) => w.weekId === active.id);
    const to = weeks.findIndex((w) => w.weekId === over.id);
    if (from !== -1 && to !== -1) commit(arrayMove(weeks, from, to));
  };

  const cleaned = cleanOutline(weeks);

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWeekDragEnd}>
        <SortableContext items={weeks.map((w) => w.weekId)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-4">
            {weeks.map((week) => (
              <SortableWeek
                key={week.weekId}
                week={week}
                canRemove={weeks.length > 1}
                onChange={(updated) =>
                  commit(weeks.map((w) => (w.weekId === updated.weekId ? updated : w)))
                }
                onRemove={() => commit(weeks.filter((w) => w.weekId !== week.weekId))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => commit([...weeks, emptyWeek(weeks.length + 1)])}>
          + Add week
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {cleaned.length} week{cleaned.length === 1 ? "" : "s"},{" "}
            {cleaned.reduce((n, w) => n + w.topics.length, 0)} topics
          </span>
          <Button onClick={() => onSave(cleaned)}>Save outline</Button>
        </div>
      </div>
    </div>
  );
}
