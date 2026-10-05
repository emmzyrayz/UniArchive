// components/admin/broadcasts/TemplateFieldsForm.tsx
// The editor form for a broadcast template, generated from its field
// definitions (lib/broadcast/templates.ts).
"use client";

import { useEffect, useState } from "react";
import { FiArrowDown, FiArrowUp, FiX } from "react-icons/fi";
import type { AdminMaterialsResponse } from "@/types/admin";
import type { FieldDef, MaterialRef, TemplateDef, TemplateFields } from "@/lib/broadcast/templates";
import { inputClass, selectClass } from "../adminUi";

const SEARCH_DEBOUNCE_MS = 300;

function MaterialPicker({ field, value, onChange }: { field: FieldDef; value: MaterialRef[]; onChange: (v: MaterialRef[]) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MaterialRef[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ search: term, status: "active", limit: "8" });
      fetch(`/api/admin/materials?${query}`, { signal: controller.signal, cache: "no-store" })
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as (AdminMaterialsResponse & { message?: string }) | null;
          if (!res.ok || !data) throw new Error(data?.message ?? `HTTP ${res.status}`);
          setResults(
            data.materials.map((m) => ({
              id: m.id,
              title: m.title,
              ...(m.courseCode && { courseCode: m.courseCode }),
              ...((m.universityAbbr || m.universityName) && { school: m.universityAbbr || m.universityName }),
            })),
          );
          setError(null);
        })
        .catch((err: Error) => {
          if (err.name !== "AbortError") setError(err.message || "Search failed.");
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const move = (index: number, by: -1 | 1) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };
  const full = value.length >= field.max;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ol className="space-y-2">
          {value.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="flex-1">
                <span className="font-medium text-text-primary">{m.title}</span>
                <span className="block text-xs text-text-muted">{[m.courseCode, m.school].filter(Boolean).join(" · ")}</span>
              </span>
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-text-muted disabled:opacity-30">
                <FiArrowUp />
              </button>
              <button type="button" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="p-1 text-text-muted disabled:opacity-30">
                <FiArrowDown />
              </button>
              <button type="button" aria-label={`Remove ${m.title}`} onClick={() => onChange(value.filter((x) => x.id !== m.id))} className="p-1 text-text-muted hover:text-red-500">
                <FiX />
              </button>
            </li>
          ))}
        </ol>
      )}
      {full ? (
        <p className="text-xs text-text-muted">That&apos;s the maximum of {field.max}.</p>
      ) : (
        <>
          <input
            type="search"
            className={inputClass}
            placeholder="Search the UniLibrary by title, course code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search materials to add"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {search.trim().length >= 2 && !error && (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted">No materials match.</li>
              ) : (
                results.map((m) => {
                  const added = value.some((v) => v.id === m.id);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={added}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-raised disabled:opacity-50"
                        onClick={() => {
                          onChange([...value, m]);
                          setSearch("");
                        }}
                      >
                        <span className="font-medium text-text-primary">{m.title}</span>
                        {added && <span className="text-xs text-text-muted"> (added)</span>}
                        <span className="block text-xs text-text-muted">{[m.courseCode, m.school].filter(Boolean).join(" · ")}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Field({ field, value, onChange }: { field: FieldDef; value: TemplateFields[string]; onChange: (v: TemplateFields[string]) => void }) {
  const id = `field-${field.name}`;
  const label = (
    <span className="block text-sm font-medium text-text-secondary">
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </span>
  );
  const help = field.help && <span className="mt-1 block text-xs text-text-muted">{field.help}</span>;

  switch (field.type) {
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );
    case "materials":
      return (
        <div>
          {label}
          <div className="mt-1">
            <MaterialPicker field={field} value={Array.isArray(value) ? (value as MaterialRef[]) : []} onChange={onChange} />
          </div>
          {help}
        </div>
      );
    case "select":
      return (
        <label htmlFor={id} className="block">
          {label}
          <select id={id} className={`mt-1 w-full ${selectClass}`} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}>
            {!field.required && <option value="">None</option>}
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {help}
        </label>
      );
    case "lines":
    case "textarea": {
      const text = field.type === "lines" ? (Array.isArray(value) ? (value as string[]).join("\n") : "") : typeof value === "string" ? value : "";
      return (
        <label htmlFor={id} className="block">
          {label}
          <textarea
            id={id}
            className={`mt-1 ${field.type === "lines" ? "min-h-24" : "min-h-36"} ${inputClass}`}
            value={text}
            maxLength={field.type === "textarea" ? field.max : undefined}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.type === "lines" ? e.target.value.split("\n") : e.target.value)}
          />
          {field.type === "textarea" && (
            <span className="mt-1 block text-right text-xs text-text-muted">
              {text.length.toLocaleString()} / {field.max.toLocaleString()}
            </span>
          )}
          {help}
        </label>
      );
    }
    default:
      return (
        <label htmlFor={id} className="block">
          {label}
          <input
            id={id}
            type={field.type === "url" ? "url" : "text"}
            className={`mt-1 ${inputClass}`}
            value={typeof value === "string" ? value : ""}
            maxLength={field.max}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </label>
      );
  }
}

export function TemplateFieldsForm({
  template,
  fields,
  onChange,
}: {
  template: TemplateDef;
  fields: TemplateFields;
  onChange: (fields: TemplateFields) => void;
}) {
  return (
    <div className="space-y-4">
      {template.fields.map((f) => (
        <Field key={f.name} field={f} value={fields[f.name]} onChange={(v) => onChange({ ...fields, [f.name]: v })} />
      ))}
    </div>
  );
}

