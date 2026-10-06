// src/components/submit/materialFields.tsx
// The material metadata fields, shared by the student submission form
// (SubmissionForm) and the staff verify workspace (components/mod), so both
// collect and validate the same data the same way.
"use client";

import AuthInput from "@/app/auth/components/UI/AuthInput";
import { TagInput } from "@/components/UI/TagInput";
import UniversityCombobox, {
  FIELD_CLASS,
  type UniversityOption,
} from "@/components/profile/UniversityCombobox";
import { useInstitutionOptions } from "@/components/profile/useInstitutionOptions";
import { CATEGORIES } from "@/lib/constants/materialCategories";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { SuggestionFieldsDto } from "@/types/unilibrary";

export const LEVELS = ["100L", "200L", "300L", "400L", "500L", "PG"] as const;
export const SEMESTERS = ["First", "Second"] as const;
export const MAX_TAGS = 10;

export interface Ref {
  id: string;
  name: string;
}

export interface MaterialFormState {
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

export type MaterialFormErrors = Partial<Record<keyof MaterialFormState, string>>;

export const EMPTY_MATERIAL_FORM: MaterialFormState = {
  title: "",
  description: "",
  category: "",
  subcategory: "",
  tags: [],
  university: null,
  faculty: null,
  department: null,
  courseCode: "",
  courseName: "",
  level: "",
  semester: "",
  academicYear: "",
};

/** The basics: title, description, category (and type), tags. */
export function validateBasics(form: MaterialFormState): MaterialFormErrors {
  const errors: MaterialFormErrors = {};
  if (!form.title.trim()) errors.title = "Give the material a title.";
  else if (form.title.length > 200) errors.title = "Keep the title under 200 characters.";
  if (!form.description.trim()) errors.description = "A description is required.";
  else if (form.description.length > 2000) errors.description = "Keep it under 2000 characters.";
  if (!form.category) errors.category = "Choose a category.";
  return errors;
}

/** University (required), course code and academic year formats. */
export function validateAcademic(form: MaterialFormState): MaterialFormErrors {
  const errors: MaterialFormErrors = {};
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
  return errors;
}

/**
 * A form filled from stored details (a reader's suggestion, or a material's
 * current details). Levels are stored as "300" and shown as "300L".
 */
export function formFromSuggestion(f: SuggestionFieldsDto): MaterialFormState {
  const ref = (id?: string, name?: string): Ref | null => (id && name ? { id, name } : null);
  const university = ref(f.universityId, f.universityName);
  const faculty = university ? ref(f.facultyId, f.facultyName) : null;
  return {
    ...EMPTY_MATERIAL_FORM,
    title: f.title,
    description: f.description,
    category: f.category,
    subcategory: f.subcategory ?? "",
    tags: f.tags,
    university,
    faculty,
    department: faculty ? ref(f.departmentId, f.departmentName) : null,
    courseCode: f.courseCode ?? "",
    courseName: f.courseName ?? "",
    level: f.level ? (/^\d+$/.test(f.level) ? `${f.level}L` : f.level) : "",
    semester: f.semester ?? "",
    academicYear: f.academicYear ?? "",
  };
}

/** The API fields for this form state (same shape for every material API). */
export function materialBody(form: MaterialFormState) {
  return {
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

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary">
      {children}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-error mt-1">{message}</p> : null;
}

interface FieldsProps {
  form: MaterialFormState;
  errors: MaterialFormErrors;
  update: <K extends keyof MaterialFormState>(key: K, value: MaterialFormState[K]) => void;
  /** Prefix for element ids, so two forms on a page don't clash. */
  idPrefix?: string;
}

export function BasicsFields({
  form,
  errors,
  update,
  idPrefix = "sub",
  descriptionHint,
}: FieldsProps & { descriptionHint?: ReactNode }) {
  const subcategories = CATEGORIES.find((c) => c.id === form.category)?.subcategories ?? [];
  return (
    <>
      <AuthInput
        id={`${idPrefix}-title`}
        label="Title"
        value={form.title}
        maxLength={200}
        onChange={(e) => update("title", e.target.value)}
        error={errors.title}
      />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <span className="text-xs text-text-muted">{form.description.length}/2000</span>
        </div>
        <textarea
          id={`${idPrefix}-description`}
          rows={5}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What does this document cover? Topics, which exam, what's included…"
          className={`${FIELD_CLASS} resize-y ${errors.description ? "border-error" : "border-neutral-200 dark:border-neutral-600"}`}
        />
        {!errors.description && descriptionHint}
        <FieldError message={errors.description} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-category`}>Category</Label>
          <select
            id={`${idPrefix}-category`}
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
          <Label htmlFor={`${idPrefix}-subcategory`}>
            Type <span className="text-text-muted font-normal">(optional)</span>
          </Label>
          <select
            id={`${idPrefix}-subcategory`}
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
  );
}

export function AcademicFields({
  form,
  errors,
  update,
  setForm,
  idPrefix = "sub",
}: FieldsProps & { setForm: Dispatch<SetStateAction<MaterialFormState>> }) {
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

  const selectUniversity = (u: UniversityOption) => {
    setForm((f) =>
      f.university?.id === u._id
        ? f
        : { ...f, university: { id: u._id, name: u.name }, faculty: null, department: null },
    );
    // Same value again, through update() so the "choose a university" error clears
    update("university", { id: u._id, name: u.name });
  };

  return (
    <>
      <UniversityCombobox value={form.university} onChange={selectUniversity} error={errors.university} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-faculty`}>Faculty</Label>
          <select
            id={`${idPrefix}-faculty`}
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
          <Label htmlFor={`${idPrefix}-department`}>Department</Label>
          <select
            id={`${idPrefix}-department`}
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
            {form.department && !departmentOptions.items.some((o) => o._id === form.department?.id) && (
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
          id={`${idPrefix}-course-code`}
          label="Course code"
          placeholder="e.g. CSC301"
          value={form.courseCode}
          maxLength={12}
          onChange={(e) => update("courseCode", e.target.value.toUpperCase())}
          error={errors.courseCode}
        />
        <AuthInput
          id={`${idPrefix}-course-name`}
          label="Course name"
          placeholder="e.g. Data Structures"
          value={form.courseName}
          maxLength={150}
          onChange={(e) => update("courseName", e.target.value)}
        />
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-level`}>Level</Label>
          <select
            id={`${idPrefix}-level`}
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
          <Label htmlFor={`${idPrefix}-semester`}>Semester</Label>
          <select
            id={`${idPrefix}-semester`}
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
          id={`${idPrefix}-academic-year`}
          label="Academic year (optional)"
          placeholder="e.g. 2023/2024"
          value={form.academicYear}
          maxLength={9}
          onChange={(e) => update("academicYear", e.target.value)}
          error={errors.academicYear}
        />
      </div>
    </>
  );
}
