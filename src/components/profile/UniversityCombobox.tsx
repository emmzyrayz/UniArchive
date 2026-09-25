// src/components/profile/UniversityCombobox.tsx
// Searchable university picker backed by GET /api/institutions/universities.
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";

export interface UniversityOption {
  _id: string;
  name: string;
  abbreviation: string;
  state?: string;
}

interface Props {
  value: { id: string; name: string } | null;
  onChange: (university: UniversityOption) => void;
  /** "My school isn't listed": opens the suggestion form with the query. */
  onAddSchool?: (universityName: string) => void;
  error?: string;
}

const MIN_QUERY = 2;
// The "add my school" option appears once the query is this long
const MIN_ADD_QUERY = 3;
const DEBOUNCE_MS = 300;

export const FIELD_CLASS =
  "w-full px-4 py-3 border rounded-md bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed";

export default function UniversityCombobox({ value, onChange, onAddSchool, error }: Props) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<{ query: string; items: UniversityOption[] }>({
    query: "",
    items: [],
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_QUERY && results.query !== trimmed;
  const options = trimmed.length >= MIN_QUERY && results.query === trimmed ? results.items : [];

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/institutions/universities?q=${encodeURIComponent(trimmed)}&limit=10`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { universities: UniversityOption[] };
        setResults({ query: trimmed, items: data.universities });
        setFetchError(null);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults({ query: trimmed, items: [] });
        setFetchError("Couldn't load universities. Check your connection.");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Close when clicking outside
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const select = (option: UniversityOption) => {
    onChange(option);
    setQuery("");
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(options[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showList = isOpen && trimmed.length >= MIN_QUERY;

  return (
    <div className="space-y-1.5 w-full" ref={containerRef}>
      <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
        University
      </label>
      {value && !isOpen && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-md border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700">
          <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
            {value.name}
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      )}
      <div className={`relative ${value && !isOpen ? "hidden" : ""}`}>
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search by name or abbreviation (e.g. UNIZIK)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          className={`${FIELD_CLASS} pl-10 pr-10 ${error ? "border-error" : "border-neutral-200 dark:border-neutral-600"}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-text-primary"
          >
            <FiX />
          </button>
        )}
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg"
          >
            {searching && <li className="px-4 py-3 text-sm text-text-muted">Searching…</li>}
            {!searching && fetchError && (
              <li className="px-4 py-3 text-sm text-error">{fetchError}</li>
            )}
            {!searching && !fetchError && options.length === 0 && (
              <li className="px-4 py-3 text-sm text-text-muted">No universities found.</li>
            )}
            {!searching &&
              options.map((option, i) => (
                <li
                  key={option._id}
                  role="option"
                  aria-selected={i === activeIndex}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => select(option)}
                  className={`px-4 py-2.5 cursor-pointer text-sm ${
                    i === activeIndex
                      ? "bg-primary/10"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="font-medium text-text-primary">{option.abbreviation}</span>
                  <span className="text-text-secondary"> — {option.name}</span>
                </li>
              ))}
            {onAddSchool && !searching && trimmed.length >= MIN_ADD_QUERY && (
              <li role="presentation">
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setIsOpen(false);
                    onAddSchool(trimmed);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-left text-sm border-t border-neutral-200 dark:border-neutral-700 text-primary hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                >
                  <FiPlus className="shrink-0" />
                  <span className="truncate">Add &ldquo;{trimmed}&rdquo; — my school isn&apos;t listed</span>
                </button>
              </li>
            )}
          </ul>
        )}
        {isOpen && trimmed.length < MIN_QUERY && (
          <p className="text-xs text-text-muted mt-1">Type at least {MIN_QUERY} characters.</p>
        )}
      </div>
      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </div>
  );
}
