// src/components/profile/SchoolSuggestionModal.tsx
// "My school isn't listed" form. Submits to POST /api/institutions/suggest,
// which either finds the school after all (auto_resolved) or queues a
// suggestion for admin review.
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FiInfo, FiX } from "react-icons/fi";
import AuthInput from "@/app/auth/components/UI/AuthInput";
import { FIELD_CLASS } from "@/components/profile/UniversityCombobox";
import { NIGERIAN_STATES } from "@/lib/constants/nigerianStates";

const OWNERSHIPS = ["Federal", "State", "Private"] as const;

interface NamedRef {
  id: string;
  name: string;
}

export interface ResolvedSchool {
  university: NamedRef & { abbreviation: string };
  faculty: NamedRef;
  department: NamedRef;
}

interface Props {
  open: boolean;
  /** Pre-fills the university name with what was typed in the combobox. */
  initialUniversityName: string;
  onClose: () => void;
  /** The school already existed; the server has updated the profile. */
  onResolved: (school: ResolvedSchool, message: string) => void;
  /** A suggestion was queued for review. */
  onSubmitted: (suggestionId: string, message: string) => void;
}

type SuggestResponse =
  | ({ outcome: "auto_resolved"; message: string } & ResolvedSchool)
  | { outcome: string; message: string; suggestionId: string };

export default function SchoolSuggestionModal({
  open,
  initialUniversityName,
  onClose,
  onResolved,
  onSubmitted,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <SuggestionForm
          key="school-suggestion"
          initialUniversityName={initialUniversityName}
          onClose={onClose}
          onResolved={onResolved}
          onSubmitted={onSubmitted}
        />
      )}
    </AnimatePresence>
  );
}

// Mounted fresh each time the modal opens, so the fields start from the
// combobox text without syncing state in an effect.
function SuggestionForm({
  initialUniversityName,
  onClose,
  onResolved,
  onSubmitted,
}: Omit<Props, "open">) {
  const [universityName, setUniversityName] = useState(initialUniversityName);
  const [universityAbbr, setUniversityAbbr] = useState("");
  const [universityState, setUniversityState] = useState("");
  const [ownership, setOwnership] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const required = (value: string, label: string) =>
    submitted && !value.trim() ? `${label} is required.` : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    // This form renders inside the profile form's React tree; don't let the
    // submit bubble up and save the profile.
    e.preventDefault();
    e.stopPropagation();
    setSubmitted(true);
    setError(null);
    if (!universityName.trim() || !universityState || !facultyName.trim() || !departmentName.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/institutions/suggest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityName: universityName.trim(),
          universityAbbr: universityAbbr.trim() || undefined,
          universityState,
          universityOwnership: ownership || undefined,
          facultyName: facultyName.trim(),
          departmentName: departmentName.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<SuggestResponse>;
      if (!res.ok) {
        setError(data.message ?? "Couldn't submit your school. Please try again.");
        return;
      }
      const result = data as SuggestResponse;
      if (result.outcome === "auto_resolved" && "university" in result) {
        onResolved(
          { university: result.university, faculty: result.faculty, department: result.department },
          result.message,
        );
      } else if ("suggestionId" in result) {
        onSubmitted(result.suggestionId, result.message);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggest-school-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-t-2xl sm:rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 id="suggest-school-title" className="font-semibold text-text-primary">
            My school isn&apos;t listed
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          <AuthInput
            id="suggest-university"
            label="University / Institution name *"
            value={universityName}
            maxLength={150}
            placeholder="e.g. Covenant University, Ota"
            onChange={(e) => setUniversityName(e.target.value)}
            error={required(universityName, "University name")}
          />
          <AuthInput
            id="suggest-abbr"
            label="Abbreviation (optional)"
            value={universityAbbr}
            maxLength={20}
            placeholder="e.g. CU"
            onChange={(e) => setUniversityAbbr(e.target.value)}
          />

          <div className="space-y-1.5">
            <label htmlFor="suggest-state" className="block text-sm font-medium text-text-secondary">
              State *
            </label>
            <select
              id="suggest-state"
              value={universityState}
              onChange={(e) => setUniversityState(e.target.value)}
              className={`${FIELD_CLASS} ${
                submitted && !universityState ? "border-error" : "border-neutral-200 dark:border-neutral-600"
              }`}
            >
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {submitted && !universityState && (
              <p className="text-sm text-error mt-1">State is required.</p>
            )}
          </div>

          <fieldset className="space-y-1.5">
            <legend className="block text-sm font-medium text-text-secondary">
              Ownership (optional)
            </legend>
            <div className="flex flex-wrap gap-4 pt-1">
              {OWNERSHIPS.map((o) => (
                <label key={o} className="inline-flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="radio"
                    name="suggest-ownership"
                    value={o}
                    checked={ownership === o}
                    onChange={() => setOwnership(o)}
                    className="accent-primary"
                  />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>

          <AuthInput
            id="suggest-faculty"
            label="Faculty / College / School *"
            value={facultyName}
            maxLength={150}
            placeholder="e.g. College of Engineering"
            onChange={(e) => setFacultyName(e.target.value)}
            error={required(facultyName, "Faculty")}
          />
          <AuthInput
            id="suggest-department"
            label="Department *"
            value={departmentName}
            maxLength={150}
            placeholder="e.g. Computer and Information Sciences"
            onChange={(e) => setDepartmentName(e.target.value)}
            error={required(departmentName, "Department")}
          />

          <div className="flex gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700 p-3 text-sm text-text-secondary">
            <FiInfo className="shrink-0 mt-0.5 text-primary" />
            <p>
              We&apos;ll review your submission and add your school within 48 hours. You&apos;ll be
              notified when it&apos;s approved.
            </p>
          </div>

          {error && (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-600 text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting…" : "Submit School"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
