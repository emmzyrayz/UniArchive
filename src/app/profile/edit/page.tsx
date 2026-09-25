// src/app/profile/edit/page.tsx
// Edits the signed-in user's profile. Loads current values from
// /api/auth/me, sends only the changed fields to PATCH /api/user/profile.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FiCheckCircle, FiLock } from "react-icons/fi";
import { useUser, type MeResponse } from "@/context/userContext";
import AuthInput from "@/app/auth/components/UI/AuthInput";
import AvatarUploader from "@/components/profile/AvatarUploader";
import UniversityCombobox, {
  FIELD_CLASS,
  type UniversityOption,
} from "@/components/profile/UniversityCombobox";
import { PROFILE_CARD_CLASS, ROLE_LABELS } from "@/components/profile/profileUi";
import {
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_LEVELS,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_SEMESTERS,
  normalizeNigerianPhone,
  validateDob,
} from "@/lib/constants/profile";

type MeUser = MeResponse["user"];

interface Ref {
  id: string;
  name: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  bio: string;
  dob: string; // yyyy-mm-dd
  phone: string; // the 10 digits after +234; empty = unchanged
  profilePhoto: string;
  university: Ref | null;
  faculty: Ref | null;
  department: Ref | null;
  level: string;
  semester: string;
}

interface Option {
  _id: string;
  name: string;
}

function toDateInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formFromUser(user: MeUser): FormState {
  const [first = "", ...rest] = (user.fullName ?? "").split(/\s+/);
  return {
    firstName: user.firstName ?? first,
    lastName: user.lastName ?? rest.join(" "),
    bio: user.bio ?? "",
    dob: toDateInput(user.dob),
    phone: "",
    profilePhoto: user.profilePhoto ?? "",
    university: user.universityId
      ? { id: user.universityId, name: user.universityName ?? "" }
      : null,
    faculty: user.facultyId ? { id: user.facultyId, name: user.facultyName ?? "" } : null,
    department: user.departmentId
      ? { id: user.departmentId, name: user.departmentName ?? "" }
      : null,
    level: user.level ?? "",
    semester: user.semester ?? "",
  };
}

/** Builds the PATCH body from the fields that differ from the initial values. */
function changedFields(initial: FormState, form: FormState): Record<string, string> {
  const body: Record<string, string> = {};
  for (const key of ["firstName", "lastName", "bio", "dob", "profilePhoto", "level", "semester"] as const) {
    if (form[key].trim() !== initial[key].trim()) body[key] = form[key].trim();
  }
  if (form.phone) body.phone = `+234${form.phone}`;

  // The server validates the chain, so send every selected level from the
  // top whenever any of them changed.
  const institutionChanged =
    form.university?.id !== initial.university?.id ||
    form.faculty?.id !== initial.faculty?.id ||
    form.department?.id !== initial.department?.id;
  if (institutionChanged && form.university) {
    body.universityId = form.university.id;
    if (form.faculty) body.facultyId = form.faculty.id;
    if (form.faculty && form.department) body.departmentId = form.department.id;
  }
  return body;
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  if (form.bio.length > PROFILE_BIO_MAX_LENGTH) {
    errors.bio = `Bio must be at most ${PROFILE_BIO_MAX_LENGTH} characters.`;
  }
  if (form.dob) {
    const dobError = validateDob(form.dob);
    if (dobError) errors.dob = dobError;
  }
  if (form.phone && !normalizeNigerianPhone(`+234${form.phone}`)) {
    errors.phone = "Enter a valid Nigerian number: 10 digits after +234, e.g. 8031234567.";
  }
  return errors;
}

function LockedField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <div className="flex items-center gap-2 px-4 py-3 rounded-md border border-neutral-200 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900/40 text-sm text-text-muted">
        <FiLock className="shrink-0" aria-label="Locked" />
        <span className="truncate flex-1">{children}</span>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-4">
      {children}
    </h2>
  );
}

/** Loads the options for a dependent dropdown, keyed by its parent id. */
function useOptions(url: string | null, listKey: "faculties" | "departments") {
  const [state, setState] = useState<{ url: string | null; items: Option[]; error: boolean }>({
    url: null,
    items: [],
    error: false,
  });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Record<string, Option[]>;
        setState({ url, items: data[listKey] ?? [], error: false });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ url, items: [], error: true });
      }
    })();
    return () => controller.abort();
  }, [url, listKey]);

  const ready = !!url && state.url === url;
  return {
    items: ready ? state.items : [],
    loading: !!url && !ready,
    error: ready && state.error,
  };
}

export default function EditProfilePage() {
  const router = useRouter();
  const { hasActiveSession, isLoading: sessionLoading, refreshUserData } = useUser();

  const [me, setMe] = useState<MeUser | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !hasActiveSession) {
      router.replace("/auth?view=signin&from=%2Fprofile%2Fedit");
    }
  }, [sessionLoading, hasActiveSession, router]);

  // Fresh values straight from the server, not the (possibly stale) context
  useEffect(() => {
    if (!hasActiveSession) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const { user } = (await res.json()) as MeResponse;
        const values = formFromUser(user);
        setMe(user);
        setInitial(values);
        setForm(values);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setLoadError("Couldn't load your profile. Refresh to try again.");
      }
    })();
    return () => controller.abort();
  }, [hasActiveSession]);

  const universityId = form?.university?.id ?? null;
  const facultyId = form?.faculty?.id ?? null;
  const faculties = useOptions(
    universityId ? `/api/institutions/faculties?universityId=${universityId}` : null,
    "faculties",
  );
  const departments = useOptions(
    universityId && facultyId
      ? `/api/institutions/departments?facultyId=${facultyId}&universityId=${universityId}`
      : null,
    "departments",
  );

  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const body = useMemo(
    () => (initial && form ? changedFields(initial, form) : {}),
    [initial, form],
  );
  const isDirty = Object.keys(body).length > 0;
  const hasErrors = Object.keys(errors).length > 0;

  if (sessionLoading || !hasActiveSession) return null;

  if (loadError) {
    return (
      <div className="min-h-screen mt-[70px] px-4 py-10 text-center text-sm text-error">
        {loadError}
      </div>
    );
  }
  if (!form || !me) {
    return (
      <div className="min-h-screen mt-[70px] px-4 py-10 text-center text-sm text-text-muted">
        Loading your profile…
      </div>
    );
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setTouched((t) => ({ ...t, [key]: true }));
    setSaveError(null);
  };
  const fieldError = (key: keyof FormState) => (touched[key] ? errors[key] : undefined);

  const selectUniversity = (u: UniversityOption) => {
    setForm((f) =>
      f && f.university?.id !== u._id
        ? { ...f, university: { id: u._id, name: u.name }, faculty: null, department: null }
        : f,
    );
    setSaveError(null);
  };

  const selectFaculty = (id: string) => {
    const match = faculties.items.find((o) => o._id === id);
    setForm((f) =>
      f && f.faculty?.id !== id
        ? { ...f, faculty: match ? { id, name: match.name } : null, department: null }
        : f,
    );
    setSaveError(null);
  };

  const selectDepartment = (id: string) => {
    const match = departments.items.find((o) => o._id === id);
    update("department", match ? { id, name: match.name } : null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Show every error on submit, not just the touched ones
    setTouched({
      firstName: true, lastName: true, bio: true, dob: true, phone: true,
    });
    if (!isDirty || hasErrors || saving || avatarUploading) return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setSaveError(data.message ?? "Couldn't save your changes. Please try again.");
        setSaving(false);
        return;
      }
      await refreshUserData({ force: true });
      setToast("Profile updated");
      setTimeout(() => router.push("/profile"), 1500);
    } catch {
      setSaveError("Network error. Check your connection and try again.");
      setSaving(false);
    }
  };

  const selectClass = (disabled: boolean) =>
    `${FIELD_CLASS} border-neutral-200 dark:border-neutral-600 ${disabled ? "" : "cursor-pointer"}`;

  return (
    <div className="min-h-screen mt-[70px] px-4 sm:px-6 py-10">
      <form onSubmit={onSubmit} noValidate className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Edit profile</h1>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* LEFT: avatar + locked fields */}
          <section className={`${PROFILE_CARD_CLASS} p-6 space-y-6 self-start`}>
            <AvatarUploader
              name={me.fullName}
              photoUrl={form.profilePhoto}
              onUploaded={(url) => update("profilePhoto", url)}
              onUploadingChange={setAvatarUploading}
            />
            <div className="space-y-4">
              <LockedField label="Email">
                <span className="inline-flex items-center gap-2">
                  {me.email || "—"}
                  {me.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <FiCheckCircle /> Verified
                    </span>
                  )}
                </span>
              </LockedField>
              <LockedField label="Username">{me.username ? `@${me.username}` : "Not set"}</LockedField>
              <LockedField label="Role">{ROLE_LABELS[me.role] ?? me.role}</LockedField>
              <LockedField label="Member ID (UPID)">{me.upid}</LockedField>
            </div>
          </section>

          {/* RIGHT: editable fields */}
          <section className={`${PROFILE_CARD_CLASS} p-6 space-y-8`}>
            <div>
              <SectionHeading>Personal info</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                <AuthInput
                  id="firstName"
                  label="First name"
                  value={form.firstName}
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  autoComplete="given-name"
                  onChange={(e) => update("firstName", e.target.value)}
                  error={fieldError("firstName")}
                />
                <AuthInput
                  id="lastName"
                  label="Last name"
                  value={form.lastName}
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  autoComplete="family-name"
                  onChange={(e) => update("lastName", e.target.value)}
                  error={fieldError("lastName")}
                />
              </div>

              <div className="space-y-1.5 mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="bio" className="block text-sm font-medium text-text-secondary">
                    Bio
                  </label>
                  <span
                    className={`text-xs ${form.bio.length > PROFILE_BIO_MAX_LENGTH ? "text-error" : "text-text-muted"}`}
                  >
                    {form.bio.length}/{PROFILE_BIO_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  id="bio"
                  rows={3}
                  value={form.bio}
                  placeholder="A line or two about you and what you study"
                  onChange={(e) => update("bio", e.target.value)}
                  className={`${FIELD_CLASS} resize-y ${errors.bio ? "border-error" : "border-neutral-200 dark:border-neutral-600"}`}
                />
                {errors.bio && <p className="text-sm text-error mt-1">{errors.bio}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <AuthInput
                  id="dob"
                  type="date"
                  label="Date of birth"
                  value={form.dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => update("dob", e.target.value)}
                  error={fieldError("dob")}
                />
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-sm font-medium text-text-secondary">
                    Phone number
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-neutral-200 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900/40 text-sm text-text-secondary select-none">
                      +234
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder={me.phoneMasked ? "●●● ●●● ●●●●" : "8031234567"}
                      value={form.phone}
                      onChange={(e) => {
                        // Digits only; drop a leading 0 typed out of habit
                        let digits = e.target.value.replace(/\D/g, "");
                        if (digits.startsWith("0")) digits = digits.slice(1);
                        update("phone", digits.slice(0, 10));
                      }}
                      className={`${FIELD_CLASS} rounded-l-none ${fieldError("phone") ? "border-error" : "border-neutral-200 dark:border-neutral-600"}`}
                    />
                  </div>
                  {fieldError("phone") ? (
                    <p className="text-sm text-error mt-1">{fieldError("phone")}</p>
                  ) : (
                    me.phoneMasked && (
                      <p className="text-xs text-text-muted">
                        A number is saved ({me.phoneMasked}). Enter a new one to replace it.
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>

            <div>
              <SectionHeading>Academic info</SectionHeading>
              <div className="space-y-4">
                <UniversityCombobox value={form.university} onChange={selectUniversity} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="faculty" className="block text-sm font-medium text-text-secondary">
                      Faculty
                    </label>
                    <select
                      id="faculty"
                      value={form.faculty?.id ?? ""}
                      disabled={!form.university || faculties.loading}
                      onChange={(e) => selectFaculty(e.target.value)}
                      className={selectClass(!form.university)}
                    >
                      <option value="">
                        {!form.university
                          ? "Select a university first"
                          : faculties.loading
                            ? "Loading faculties…"
                            : "Select a faculty"}
                      </option>
                      {/* Keep the saved choice visible while the list loads */}
                      {form.faculty && !faculties.items.some((o) => o._id === form.faculty?.id) && (
                        <option value={form.faculty.id}>{form.faculty.name}</option>
                      )}
                      {faculties.items.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    {faculties.error && (
                      <p className="text-sm text-error mt-1">Couldn&apos;t load faculties.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="department" className="block text-sm font-medium text-text-secondary">
                      Department
                    </label>
                    <select
                      id="department"
                      value={form.department?.id ?? ""}
                      disabled={!form.faculty || departments.loading}
                      onChange={(e) => selectDepartment(e.target.value)}
                      className={selectClass(!form.faculty)}
                    >
                      <option value="">
                        {!form.faculty
                          ? "Select a faculty first"
                          : departments.loading
                            ? "Loading departments…"
                            : "Select a department"}
                      </option>
                      {form.department &&
                        !departments.items.some((o) => o._id === form.department?.id) && (
                          <option value={form.department.id}>{form.department.name}</option>
                        )}
                      {departments.items.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    {departments.error && (
                      <p className="text-sm text-error mt-1">Couldn&apos;t load departments.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="level" className="block text-sm font-medium text-text-secondary">
                      Level
                    </label>
                    <select
                      id="level"
                      value={form.level}
                      onChange={(e) => update("level", e.target.value)}
                      className={selectClass(false)}
                    >
                      <option value="">Select your level</option>
                      {/* Older accounts may hold a free-text level */}
                      {form.level && !(PROFILE_LEVELS as readonly string[]).includes(form.level) && (
                        <option value={form.level} disabled>
                          {form.level}
                        </option>
                      )}
                      {PROFILE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="semester" className="block text-sm font-medium text-text-secondary">
                      Semester
                    </label>
                    <select
                      id="semester"
                      value={form.semester}
                      onChange={(e) => update("semester", e.target.value)}
                      className={selectClass(false)}
                    >
                      <option value="">Select the current semester</option>
                      {PROFILE_SEMESTERS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              {saveError && (
                <p className="text-sm text-error sm:mr-auto" role="alert">
                  {saveError}
                </p>
              )}
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-600 text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isDirty || saving || avatarUploading}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : avatarUploading ? "Uploading photo…" : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      </form>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            className="fixed bottom-6 inset-x-0 z-[95] flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 rounded-lg bg-neutral-900 text-white px-4 py-3 text-sm shadow-xl">
              <FiCheckCircle className="text-green-400" /> {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
