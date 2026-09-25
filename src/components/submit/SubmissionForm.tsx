// src/components/submit/SubmissionForm.tsx
// The three-step UniLibrary submission form: basic info, academic context,
// review & submit. Saves drafts manually and every 60s while dirty.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiCheck, FiFileText } from "react-icons/fi";
import AuthInput from "@/app/auth/components/UI/AuthInput";
import { StepProgress } from "@/app/auth/components/UI/StepProgress";
import { TagInput } from "@/components/UI/TagInput";
import UniversityCombobox, {
  FIELD_CLASS,
  type UniversityOption,
} from "@/components/profile/UniversityCombobox";
import { useInstitutionOptions } from "@/components/profile/useInstitutionOptions";
import { useUser } from "@/context/userContext";
import { CATEGORIES } from "@/lib/constants/materialCategories";
import { SUBMISSION_AUTOSAVE_MS, SUBMISSION_SUCCESS_KEY } from "@/lib/constants/submissions";
import type { Book } from "@/types/library";

const STEPS = ["Basic info", "Academic context", "Review & submit"] as const;
const LEVELS = ["100L", "200L", "300L", "400L", "500L", "PG"] as const;
const SEMESTERS = ["First", "Second"] as const;
const MAX_TAGS = 10;

interface Ref {
  id: string;
  name: string;
}

export interface SubmissionFormState {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  university: Ref | null;
  faculty: Ref | null;
  department: Ref | null;
  courseCode: string;
  courseName: string;
  level: string; // profile style, "300L"
  semester: string;
  academicYear: string;
}

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

type Errors = Partial<Record<keyof SubmissionFormState, string>>;

function validateStep(step: number, form: SubmissionFormState): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (!form.title.trim()) errors.title = "Give the material a title.";
    else if (form.title.length > 200) errors.title = "Keep the title under 200 characters.";
    if (!form.description.trim()) errors.description = "A description is required.";
    else if (form.description.length > 2000) errors.description = "Keep it under 2000 characters.";
    if (!form.category) errors.category = "Choose a category.";
  }
  if (step === 1) {
    if (!form.university) errors.university = "Choose the university this material is for.";
    const code = form.courseCode.replace(/\s+/g, "").toUpperCase();
    if (code && !/^[A-Z]{2,5}\d{3}[A-Z]?$/.test(code)) {
      errors.courseCode = "Course code should look like CSC301.";
    }
    if (form.academicYear) {
      const m = /^(\d{4})\/(\d{4})$/.exec(form.academicYear.trim());
      if (!m || Number(m[2]) !== Number(m[1]) + 1) {
        errors.academicYear = "Use the format 2023/2024.";
      }
    }
  }
  return errors;
}

/** The API body for this form state. */
function toBody(bookId: string, form: SubmissionFormState, action: "save_draft" | "submit") {
  return {
    bookId,
    action,
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    subcategory: form.subcategory || undefined,
    tags: form.tags,
    universityId: form.university?.id,
    facultyId: form.university ? form.faculty?.id : undefined,
    departmentId: form.faculty ? form.department?.id : undefined,
    courseCode: form.courseCode.replace(/\s+/g, "").toUpperCase() || undefined,
    courseName: form.courseName.trim() || undefined,
    level: form.level || undefined,
    semester: form.semester || undefined,
    academicYear: form.academicYear.trim() || undefined,
  };
}

const selectClass = `${FIELD_CLASS} border-neutral-200 dark:border-neutral-600`;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-error mt-1">{message}</p> : null;
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

  const facultyOptions = useInstitutionOptions(
    form.university ? `/api/institutions/faculties?universityId=${form.university.id}` : null,
    "faculties",
  );
  const departmentOptions = useInstitutionOptions(
    form.university && form.faculty
      ? `/api/institutions/departments?facultyId=${form.faculty.id}&universityId=${form.university.id}`
      : null,
    "departments",
  );
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

  const selectUniversity = (u: UniversityOption) =>
    setForm((f) =>
      f.university?.id === u._id
        ? f
        : { ...f, university: { id: u._id, name: u.name }, faculty: null, department: null },
    );

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
          <>
            <AuthInput
              id="sub-title"
              label="Title"
              value={form.title}
              maxLength={200}
              onChange={(e) => update("title", e.target.value)}
              error={errors.title}
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sub-description">Description</Label>
                <span className="text-xs text-text-muted">{form.description.length}/2000</span>
              </div>
              <textarea
                id="sub-description"
                rows={5}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What does this document cover? Topics, which exam, what's included…"
                className={`${FIELD_CLASS} resize-y ${errors.description ? "border-error" : "border-neutral-200 dark:border-neutral-600"}`}
              />
              {!book.description && !errors.description && (
                <p className="text-xs text-text-muted">
                  A description helps reviewers understand what this document covers.
                </p>
              )}
              <FieldError message={errors.description} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sub-category">Category</Label>
                <select
                  id="sub-category"
                  value={form.category}
                  onChange={(e) => {
                    update("category", e.target.value);
                    update("subcategory", "");
                  }}
                  className={`${FIELD_CLASS} ${errors.category ? "border-error" : "border-neutral-200 dark:border-neutral-600"}`}
                >
                  <option value="">Choose a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.category} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-subcategory">
                  Type <span className="text-text-muted font-normal">(optional)</span>
                </Label>
                <select
                  id="sub-subcategory"
                  value={form.subcategory}
                  disabled={!form.category}
                  onChange={(e) => update("subcategory", e.target.value)}
                  className={selectClass}
                >
                  <option value="">{form.category ? "Any" : "Choose a category first"}</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="block text-sm font-medium text-text-secondary">
                Tags <span className="text-text-muted font-normal">(up to {MAX_TAGS})</span>
              </p>
              <TagInput tags={form.tags} onChange={(tags) => update("tags", tags)} maxTags={MAX_TAGS} />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <UniversityCombobox
              value={form.university}
              onChange={selectUniversity}
              error={errors.university}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sub-faculty">Faculty</Label>
                <select
                  id="sub-faculty"
                  value={form.faculty?.id ?? ""}
                  disabled={!form.university || facultyOptions.loading}
                  onChange={(e) => {
                    const match = facultyOptions.items.find((o) => o._id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      faculty: match ? { id: match._id, name: match.name } : null,
                      department: null,
                    }));
                  }}
                  className={selectClass}
                >
                  <option value="">
                    {!form.university
                      ? "Select a university first"
                      : facultyOptions.loading
                        ? "Loading faculties…"
                        : "Select a faculty"}
                  </option>
                  {form.faculty && !facultyOptions.items.some((o) => o._id === form.faculty?.id) && (
                    <option value={form.faculty.id}>{form.faculty.name}</option>
                  )}
                  {facultyOptions.items.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-department">Department</Label>
                <select
                  id="sub-department"
                  value={form.department?.id ?? ""}
                  disabled={!form.faculty || departmentOptions.loading}
                  onChange={(e) => {
                    const match = departmentOptions.items.find((o) => o._id === e.target.value);
                    update("department", match ? { id: match._id, name: match.name } : null);
                  }}
                  className={selectClass}
                >
                  <option value="">
                    {!form.faculty
                      ? "Select a faculty first"
                      : departmentOptions.loading
                        ? "Loading departments…"
                        : "Select a department"}
                  </option>
                  {form.department &&
                    !departmentOptions.items.some((o) => o._id === form.department?.id) && (
                      <option value={form.department.id}>{form.department.name}</option>
                    )}
                  {departmentOptions.items.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <AuthInput
                id="sub-course-code"
                label="Course code"
                placeholder="e.g. CSC301"
                value={form.courseCode}
                maxLength={12}
                onChange={(e) => update("courseCode", e.target.value.toUpperCase())}
                error={errors.courseCode}
              />
              <AuthInput
                id="sub-course-name"
                label="Course name"
                placeholder="e.g. Data Structures"
                value={form.courseName}
                maxLength={150}
                onChange={(e) => update("courseName", e.target.value)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="sub-level">Level</Label>
                <select
                  id="sub-level"
                  value={form.level}
                  onChange={(e) => update("level", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Not specified</option>
                  {form.level && !(LEVELS as readonly string[]).includes(form.level) && (
                    <option value={form.level}>{form.level}</option>
                  )}
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-semester">Semester</Label>
                <select
                  id="sub-semester"
                  value={form.semester}
                  onChange={(e) => update("semester", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Not specified</option>
                  {form.semester && !(SEMESTERS as readonly string[]).includes(form.semester) && (
                    <option value={form.semester}>{form.semester}</option>
                  )}
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <AuthInput
                id="sub-academic-year"
                label="Academic year (optional)"
                placeholder="e.g. 2023/2024"
                value={form.academicYear}
                maxLength={9}
                onChange={(e) => update("academicYear", e.target.value)}
                error={errors.academicYear}
              />
            </div>
          </>
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
