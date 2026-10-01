// src/components/submit/SubmissionForm.tsx
// The three-step UniLibrary submission form: basic info, academic context,
// review & submit. Saves drafts manually and every 60s while dirty.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiCheck, FiFileText } from "react-icons/fi";
import { StepProgress } from "@/app/auth/components/UI/StepProgress";
import { useUser } from "@/context/userContext";
import { CATEGORIES } from "@/lib/constants/materialCategories";
import { SUBMISSION_AUTOSAVE_MS, SUBMISSION_SUCCESS_KEY } from "@/lib/constants/submissions";
import type { Book } from "@/types/library";
import {
  AcademicFields,
  BasicsFields,
  LEVELS,
  MAX_TAGS,
  SEMESTERS,
  materialBody,
  validateAcademic,
  validateBasics,
  type MaterialFormErrors,
  type MaterialFormState,
  type Ref,
} from "./materialFields";

const STEPS = ["Basic info", "Academic context", "Review & submit"] as const;

export type SubmissionFormState = MaterialFormState;

/** An existing submission as returned by the API (ids as strings). */
export interface SubmissionRecord {
  _id: string;
  status: "draft" | "submitted" | "in_review" | "verified" | "rejected";
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  universityId?: string;
  universityName?: string;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  courseCode?: string;
  courseName?: string;
  level?: string; // "300"
  semester?: string;
  academicYear?: string;
  tags: string[];
  rejectionReason?: string;
  submittedAt?: string;
  updatedAt?: string;
}

function ref(id?: string, name?: string): Ref | null {
  return id ? { id, name: name ?? "" } : null;
}

/** Starting values: an existing submission, else the book, else the profile. */
export function initialFormState(
  book: Book,
  submission: SubmissionRecord | null,
  profile: {
    universityId?: string;
    universityName?: string;
    facultyId?: string;
    facultyName?: string;
    departmentId?: string;
    departmentName?: string;
    level?: string;
    semester?: string;
  } | null,
): SubmissionFormState {
  if (submission) {
    return {
      title: submission.title,
      description: submission.description,
      category: submission.category,
      subcategory: submission.subcategory ?? "",
      tags: submission.tags ?? [],
      university: ref(submission.universityId, submission.universityName),
      faculty: ref(submission.facultyId, submission.facultyName),
      department: ref(submission.departmentId, submission.departmentName),
      courseCode: submission.courseCode ?? "",
      courseName: submission.courseName ?? "",
      level: submission.level && /^\d00$/.test(submission.level) ? `${submission.level}L` : submission.level ?? "",
      semester: submission.semester ?? "",
      academicYear: submission.academicYear ?? "",
    };
  }
  // The book's own academic info wins over the profile's
  const src = book.universityId ? book : profile ?? {};
  const level = book.level ?? profile?.level ?? "";
  const semester = book.semester ?? profile?.semester ?? "";
  return {
    title: book.title,
    description: book.description ?? "",
    category: "",
    subcategory: "",
    tags: (book.tags ?? []).slice(0, MAX_TAGS),
    university: ref(src.universityId, src.universityName),
    faculty: src.universityId ? ref(src.facultyId, src.facultyName) : null,
    department: src.facultyId ? ref(src.departmentId, src.departmentName) : null,
    courseCode: "",
    courseName: "",
    level: (LEVELS as readonly string[]).includes(level) ? level : "",
    semester: (SEMESTERS as readonly string[]).includes(semester) ? semester : "",
    academicYear: "",
  };
}

type Errors = MaterialFormErrors;

function validateStep(step: number, form: SubmissionFormState): Errors {
  if (step === 0) return validateBasics(form);
  if (step === 1) return validateAcademic(form);
  return {};
}

/** The API body for this form state. */
function toBody(bookId: string, form: SubmissionFormState, action: "save_draft" | "submit") {
  return { bookId, action, ...materialBody(form) };
}

interface Props {
  book: Book;
  initial: SubmissionFormState;
  /** Set when editing a draft/rejected submission. */
  existing: SubmissionRecord | null;
}

export default function SubmissionForm({ book, initial, existing }: Props) {
  const router = useRouter();
  const { refreshUserData } = useUser();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SubmissionFormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  // JSON of the last saved (or initially loaded) state; dirty = differs from it
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const snapshot = useMemo(() => JSON.stringify(form), [form]);
  const dirty = snapshot !== savedSnapshot;
  // A draft needs the fields the model requires
  const canSaveDraft = !!(form.title.trim() && form.description.trim() && form.category);

  const subcategories = CATEGORIES.find((c) => c.id === form.category)?.subcategories ?? [];

  const update = <K extends keyof SubmissionFormState>(key: K, value: SubmissionFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setApiError(null);
  };

  const save = async (action: "save_draft" | "submit", silent = false) => {
    const body = toBody(book.id, form, action);
    const sentSnapshot = snapshot;
    const res = await fetch("/api/submissions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) {
      if (!silent) setApiError(data.message ?? "Something went wrong. Please try again.");
      return false;
    }
    setSavedSnapshot(sentSnapshot);
    setSavedAt(new Date());
    return true;
  };

  // Auto-save every 60s while there are unsaved, saveable changes. The
  // interval reads the latest save() through a ref.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const autoSaveEnabled = dirty && canSaveDraft && busy === null;
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const timer = setInterval(async () => {
      setAutoSaving(true);
      await saveRef.current("save_draft", true);
      setAutoSaving(false);
    }, SUBMISSION_AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [autoSaveEnabled]);

  const saveDraft = async () => {
    if (!canSaveDraft) {
      setApiError("Add a title, description and category before saving a draft.");
      setStep(0);
      return;
    }
    setBusy("draft");
    await save("save_draft");
    setBusy(null);
  };

  const submit = async () => {
    for (const s of [0, 1]) {
      const stepErrors = validateStep(s, form);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        setStep(s);
        return;
      }
    }
    setBusy("submit");
    const ok = await save("submit");
    if (!ok) {
      setBusy(null);
      return;
    }
    try {
      sessionStorage.setItem(SUBMISSION_SUCCESS_KEY, "1");
    } catch {
      // storage blocked: no banner, the submission still went through
    }
    void refreshUserData({ force: true });
    router.push("/home");
  };

  const next = () => {
    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const categoryLabel = CATEGORIES.find((c) => c.id === form.category)?.label;
  const subcategoryLabel = subcategories.find((s) => s.id === form.subcategory)?.label;

  return (
    <div className="space-y-6">
      <StepProgress
        labels={STEPS}
        currentIndex={step}
        onStepClick={(i) => i <= step && setStep(i)}
      />

      {existing?.status === "rejected" && (
        <div className="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-text-primary">Changes were requested</p>
            <p className="text-text-secondary mt-0.5">
              {existing.rejectionReason || "A reviewer asked for changes before this can be published."}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow p-6 space-y-5">
        {step === 0 && (
          <BasicsFields
            form={form}
            errors={errors}
            update={update}
            descriptionHint={
              !book.description && (
                <p className="text-xs text-text-muted">
                  A description helps reviewers understand what this document covers.
                </p>
              )
            }
          />
        )}

        {step === 1 && (
          <AcademicFields form={form} errors={errors} update={update} setForm={setForm} />
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="h-20 w-16 shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-text-muted">
                {book.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FiFileText size={24} />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-text-primary">{form.title}</p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {categoryLabel}
                  {subcategoryLabel && ` · ${subcategoryLabel}`}
                </p>
                {form.tags.length > 0 && (
                  <p className="text-xs text-text-muted mt-1">{form.tags.join(", ")}</p>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[
                ["University", form.university?.name],
                ["Faculty", form.faculty?.name],
                ["Department", form.department?.name],
                ["Course", [form.courseCode, form.courseName].filter(Boolean).join(" — ")],
                ["Level", form.level],
                ["Semester", form.semester],
                ["Academic year", form.academicYear],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="text-text-primary">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-text-secondary rounded-lg bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700 p-3">
              Once submitted, your document will be reviewed by our team. You&apos;ll be notified
              when it&apos;s approved or if changes are needed.
            </p>
          </div>
        )}

        {apiError && (
          <p role="alert" className="text-sm text-error">
            {apiError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <span className="text-xs text-text-muted mr-auto flex items-center gap-1" aria-live="polite">
            {autoSaving ? (
              "Saving draft…"
            ) : savedAt && !dirty ? (
              <>
                <FiCheck /> Draft saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </>
            ) : null}
          </span>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg text-text-secondary hover:text-text-primary"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={saveDraft}
            disabled={busy !== null}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-600 text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy === "draft" ? "Saving…" : "Save as Draft"}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy !== null}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy === "submit" ? "Submitting…" : "Submit for Review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
