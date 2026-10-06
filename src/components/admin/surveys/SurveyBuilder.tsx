// components/admin/surveys/SurveyBuilder.tsx
// /admin/surveys/[id]: edit a survey (details, "about you" fields,
// questions) beside a live preview, then open or close it. Edits are local
// until saved. Once answers exist, the server refuses changes that would
// alter them (removing questions or options, changing a type or a scale,
// new required questions); the builder greys those out up front.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowDown, FiArrowUp, FiClipboard, FiCopy, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import type { AdminSurveyDto } from "@/lib/survey/surveys";
import {
  LIMITS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  RESPONDENT_FIELDS,
  RESPONDENT_FIELD_LABELS,
  cleanQuestions,
  isChoiceType,
  newId,
  type Answers,
  type FieldMode,
  type QuestionType,
  type RespondentConfig,
  type SurveyQuestion,
} from "@/lib/survey/questions";
import { SurveyQuestions } from "@/components/survey/SurveyQuestions";
import { timeAgo } from "../reviewShared";
import { AdminPageShell, adminRequest, cardClass, dangerButton, inputClass, primaryButton, secondaryButton, selectClass } from "../adminUi";
import { SURVEY_STATUS_STYLE } from "./SurveysAdmin";
import { ImportQuestions } from "./ImportQuestions";

const labelClass = "mb-1 block text-sm font-medium text-text-primary";
const iconButton = "rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text-primary disabled:opacity-30";

/** ISO -> the value a datetime-local input wants (local time). */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function blankQuestion(type: QuestionType = "short_text"): SurveyQuestion {
  const q: SurveyQuestion = { id: newId(), type, label: "", required: false };
  return withTypeDefaults(q, type);
}

/** Switching type keeps the wording and fills in what the new type needs. */
function withTypeDefaults(q: SurveyQuestion, type: QuestionType): SurveyQuestion {
  const next: SurveyQuestion = { id: q.id, type, label: q.label, required: q.required, ...(q.help && { help: q.help }) };
  if (isChoiceType(type)) {
    next.options = q.options?.length ? q.options : [{ id: newId(), label: "" }, { id: newId(), label: "" }];
    if (type !== "dropdown" && q.allowOther) next.allowOther = true;
  }
  if (type === "scale") {
    next.min = q.type === "scale" ? q.min ?? 0 : 0;
    next.max = q.type === "scale" ? q.max ?? 10 : 10;
    if (q.minLabel) next.minLabel = q.minLabel;
    if (q.maxLabel) next.maxLabel = q.maxLabel;
  }
  if (type === "number" && q.type === "number") {
    if (q.min !== undefined) next.min = q.min;
    if (q.max !== undefined) next.max = q.max;
  }
  return next;
}

function QuestionEditor({
  q,
  index,
  count,
  answered,
  answeredOptions,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  disabled,
}: {
  q: SurveyQuestion;
  index: number;
  count: number;
  /** Already saved with answers in: type, removal and scale are locked */
  answered: boolean;
  answeredOptions: Set<string>;
  onChange: (q: SurveyQuestion) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const set = (patch: Partial<SurveyQuestion>) => onChange({ ...q, ...patch });
  const numberOrUndefined = (v: string) => (v === "" ? undefined : Math.trunc(Number(v)));
  const options = q.options ?? [];

  return (
    <div className={cardClass}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-text-muted">Q{index + 1}</span>
        <select
          className={`${selectClass} min-w-0 flex-1`}
          value={q.type}
          onChange={(e) => onChange(withTypeDefaults(q, e.target.value as QuestionType))}
          disabled={disabled || answered}
          aria-label="Question type"
          title={answered ? "This question has answers, so its type can't change" : undefined}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button type="button" className={iconButton} onClick={() => onMove(-1)} disabled={disabled || index === 0} aria-label="Move up">
          <FiArrowUp aria-hidden />
        </button>
        <button type="button" className={iconButton} onClick={() => onMove(1)} disabled={disabled || index === count - 1} aria-label="Move down">
          <FiArrowDown aria-hidden />
        </button>
        <button type="button" className={iconButton} onClick={onDuplicate} disabled={disabled || count >= LIMITS.questions} aria-label="Duplicate question">
          <FiCopy aria-hidden />
        </button>
        <button
          type="button"
          className={iconButton}
          onClick={onRemove}
          disabled={disabled || answered}
          aria-label="Remove question"
          title={answered ? "This question has answers, so it can't be removed" : undefined}
        >
          <FiTrash2 aria-hidden />
        </button>
      </div>

      <input
        className={inputClass}
        value={q.label}
        maxLength={LIMITS.label}
        placeholder="Question"
        onChange={(e) => set({ label: e.target.value })}
        disabled={disabled}
        aria-label={`Question ${index + 1}`}
      />
      <input
        className={`${inputClass} mt-2`}
        value={q.help ?? ""}
        maxLength={LIMITS.help}
        placeholder="Help text (optional)"
        onChange={(e) => set({ help: e.target.value || undefined })}
        disabled={disabled}
        aria-label={`Question ${index + 1} help text`}
      />

      {isChoiceType(q.type) && (
        <div className="mt-3 space-y-2">
          {options.map((o, i) => (
            <div key={o.id} className="flex items-center gap-2">
              <input
                className={inputClass}
                value={o.label}
                maxLength={LIMITS.option}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => set({ options: options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })}
                disabled={disabled}
                aria-label={`Option ${i + 1}`}
              />
              <button
                type="button"
                className={iconButton}
                onClick={() => set({ options: options.filter((x) => x.id !== o.id) })}
                disabled={disabled || answeredOptions.has(o.id)}
                aria-label={`Remove option ${i + 1}`}
                title={answeredOptions.has(o.id) ? "People may have picked this; rename it instead" : undefined}
              >
                <FiX aria-hidden />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50"
              onClick={() => set({ options: [...options, { id: newId(), label: "" }] })}
              disabled={disabled || options.length >= LIMITS.options}
            >
              <FiPlus aria-hidden /> Add option
            </button>
            {q.type !== "dropdown" && (
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={!!q.allowOther}
                  onChange={(e) => set({ allowOther: e.target.checked || undefined })}
                  disabled={disabled}
                />
                Add an &quot;Other&quot; box
              </label>
            )}
          </div>
        </div>
      )}

      {q.type === "scale" && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs text-text-secondary">
            From
            <select
              className={`${selectClass} mt-1 w-full`}
              value={q.min ?? 0}
              onChange={(e) => set({ min: Number(e.target.value) })}
              disabled={disabled || answered}
            >
              {[0, 1].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-secondary">
            To
            <select
              className={`${selectClass} mt-1 w-full`}
              value={q.max ?? 10}
              onChange={(e) => set({ max: Number(e.target.value) })}
              disabled={disabled || answered}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-secondary">
            Low end means
            <input
              className={`${inputClass} mt-1`}
              value={q.minLabel ?? ""}
              maxLength={LIMITS.scaleLabel}
              placeholder="Not likely"
              onChange={(e) => set({ minLabel: e.target.value || undefined })}
              disabled={disabled}
            />
          </label>
          <label className="text-xs text-text-secondary">
            High end means
            <input
              className={`${inputClass} mt-1`}
              value={q.maxLabel ?? ""}
              maxLength={LIMITS.scaleLabel}
              placeholder="Very likely"
              onChange={(e) => set({ maxLabel: e.target.value || undefined })}
              disabled={disabled}
            />
          </label>
        </div>
      )}

      {q.type === "number" && (
        <div className="mt-3 grid max-w-sm grid-cols-2 gap-2">
          <label className="text-xs text-text-secondary">
            Smallest (optional)
            <input
              type="number"
              className={`${inputClass} mt-1`}
              value={q.min ?? ""}
              onChange={(e) => set({ min: numberOrUndefined(e.target.value) })}
              disabled={disabled}
            />
          </label>
          <label className="text-xs text-text-secondary">
            Largest (optional)
            <input
              type="number"
              className={`${inputClass} mt-1`}
              value={q.max ?? ""}
              onChange={(e) => set({ max: numberOrUndefined(e.target.value) })}
              disabled={disabled}
            />
          </label>
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={q.required}
          onChange={(e) => set({ required: e.target.checked })}
          disabled={disabled}
        />
        Required
      </label>
    </div>
  );
}

const MODE_LABEL: Record<FieldMode, string> = { off: "Don't ask", optional: "Optional", required: "Required" };

export function SurveyBuilder({ id }: { id: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<AdminSurveyDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [intro, setIntro] = useState("");
  const [thankYou, setThankYou] = useState("");
  const [fields, setFields] = useState<RespondentConfig | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "status" | "duplicate" | "delete" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Answers>({});
  const [importing, setImporting] = useState(false);

  const apply = useCallback((s: AdminSurveyDto) => {
    setLoaded(s);
    setTitle(s.title);
    setSlug(s.slug);
    setIntro(s.intro);
    setThankYou(s.thankYouMessage);
    setFields(s.respondentFields);
    setQuestions(s.questions);
    setOpensAt(toLocalInput(s.opensAt));
    setClosesAt(toLocalInput(s.closesAt));
    setDirty(false);
  }, []);

  useEffect(() => {
    adminRequest<{ survey: AdminSurveyDto }>(`/api/admin/surveys/${id}`)
      .then(({ survey }) => apply(survey))
      .catch((err: Error) => setLoadError(err.message));
  }, [id, apply]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
    setMessage(null);
  };
  const setQuestionsDirty = (update: (qs: SurveyQuestion[]) => SurveyQuestion[]) => {
    setQuestions(update);
    setDirty(true);
    setMessage(null);
  };

  // With answers in, the questions saved at load time are locked down
  const answered = useMemo(() => {
    const ids = new Set<string>();
    const options = new Set<string>();
    if (loaded && loaded.responseCount > 0) {
      for (const q of loaded.questions) {
        ids.add(q.id);
        for (const o of q.options ?? []) options.add(o.id);
      }
    }
    return { ids, options };
  }, [loaded]);

  const problems = useMemo(() => {
    const list = cleanQuestions(questions).problems;
    if (!title.trim()) list.unshift("Give the survey a title.");
    if (opensAt && closesAt && new Date(opensAt) >= new Date(closesAt)) list.push("The survey closes before it opens.");
    return list;
  }, [questions, title, opensAt, closesAt]);

  const save = async (): Promise<AdminSurveyDto | null> => {
    if (!fields) return null;
    setBusy("save");
    setMessage(null);
    try {
      const { survey } = await adminRequest<{ survey: AdminSurveyDto }>(`/api/admin/surveys/${id}`, "PATCH", {
        title,
        slug,
        intro,
        thankYouMessage: thankYou,
        respondentFields: fields,
        questions,
        opensAt: fromLocalInput(opensAt),
        closesAt: fromLocalInput(closesAt),
      });
      apply(survey);
      setMessage({ tone: "ok", text: "Saved." });
      return survey;
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't save." });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (status: "open" | "closed") => {
    if (dirty && !(await save())) return;
    setBusy("status");
    setMessage(null);
    try {
      const { survey } = await adminRequest<{ survey: AdminSurveyDto }>(`/api/admin/surveys/${id}/status`, "POST", { status });
      apply(survey);
      setMessage({ tone: "ok", text: status === "open" ? "The survey is open." : "The survey is closed." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't change the status." });
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async () => {
    setBusy("duplicate");
    try {
      const { survey } = await adminRequest<{ survey: AdminSurveyDto }>(`/api/admin/surveys/${id}/duplicate`, "POST");
      router.push(`/admin/surveys/${survey.id}`);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't duplicate." });
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await adminRequest(`/api/admin/surveys/${id}`, "DELETE");
      setDirty(false);
      router.push("/admin/surveys");
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't delete." });
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  if (loadError) {
    return (
      <AdminPageShell title="Survey">
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
      </AdminPageShell>
    );
  }
  if (!loaded || !fields) {
    return (
      <AdminPageShell title="Survey" loading>
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface-raised" />
      </AdminPageShell>
    );
  }

  const working = busy !== null;
  const hasAnswers = loaded.responseCount > 0;

  return (
    <AdminPageShell
      title={loaded.title || "Untitled survey"}
      subtitle={
        <>
          <span className={`mr-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SURVEY_STATUS_STYLE[loaded.status]}`}>{loaded.status}</span>
          {loaded.responseCount.toLocaleString()} response{loaded.responseCount === 1 ? "" : "s"} · edited by {loaded.updatedBy.name}{" "}
          {timeAgo(loaded.updatedAt)} ·{" "}
          <Link href="/admin/surveys" className="text-primary hover:underline">
            All surveys
          </Link>
        </>
      }
      actions={
        <>
          {hasAnswers && (
            <Link href={`/admin/surveys/${id}/results`} className={secondaryButton}>
              Results
            </Link>
          )}
          <button type="button" className={secondaryButton} onClick={save} disabled={working || !dirty}>
            {busy === "save" ? "Saving..." : dirty ? "Save" : "Saved"}
          </button>
          {loaded.status === "open" ? (
            <button type="button" className={secondaryButton} onClick={() => setStatus("closed")} disabled={working}>
              {busy === "status" ? "Closing..." : "Close survey"}
            </button>
          ) : (
            <button
              type="button"
              className={primaryButton}
              onClick={() => setStatus("open")}
              disabled={working || problems.length > 0}
              title={problems.length ? "Finish the survey first" : undefined}
            >
              {busy === "status" ? "Opening..." : loaded.status === "closed" ? "Reopen" : "Open survey"}
            </button>
          )}
        </>
      }
    >
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mb-4 text-sm ${message.tone === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
        >
          {message.text}
        </p>
      )}
      {problems.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium">Before it can open:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {hasAnswers && (
        <p className="mb-4 rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">
          People have answered this survey, so you can reword questions and options, add options and add optional questions, but not remove
          them or change their type. To change more,{" "}
          <button type="button" className="text-primary hover:underline" onClick={duplicate} disabled={working}>
            duplicate it as a new survey
          </button>
          .
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <section className={cardClass} aria-labelledby="details">
            <h2 id="details" className="mb-3 font-semibold text-text-primary">
              Details
            </h2>
            <label className={labelClass} htmlFor="s-title">
              Title
            </label>
            <input id="s-title" className={inputClass} value={title} maxLength={150} onChange={(e) => edit(setTitle)(e.target.value)} />
            <label className={`${labelClass} mt-3`} htmlFor="s-slug">
              Link
            </label>
            <div className="flex items-center gap-1 text-sm text-text-muted">
              <span className="shrink-0">/surveys/</span>
              <input
                id="s-slug"
                className={inputClass}
                value={slug}
                maxLength={80}
                onChange={(e) => edit(setSlug)(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              />
            </div>
            {loaded.status !== "draft" && slug !== loaded.slug && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Links already shared to the old address will stop working.</p>
            )}
            <label className={`${labelClass} mt-3`} htmlFor="s-intro">
              Introduction
            </label>
            <textarea
              id="s-intro"
              className={`${inputClass} min-h-24`}
              value={intro}
              maxLength={3000}
              placeholder="Why you're asking and how long it takes."
              onChange={(e) => edit(setIntro)(e.target.value)}
            />
            <label className={`${labelClass} mt-3`} htmlFor="s-thanks">
              Thank-you message
            </label>
            <textarea
              id="s-thanks"
              className={`${inputClass} min-h-20`}
              value={thankYou}
              maxLength={1000}
              placeholder="Shown after someone submits. Leave empty for a plain thank you."
              onChange={(e) => edit(setThankYou)(e.target.value)}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-text-primary">
                Opens (optional)
                <input type="datetime-local" className={`${inputClass} mt-1`} value={opensAt} onChange={(e) => edit(setOpensAt)(e.target.value)} />
              </label>
              <label className="text-sm text-text-primary">
                Closes (optional)
                <input type="datetime-local" className={`${inputClass} mt-1`} value={closesAt} onChange={(e) => edit(setClosesAt)(e.target.value)} />
              </label>
            </div>
            <p className="mt-1 text-xs text-text-muted">An open survey only takes answers between these times. Leave them empty to run until closed.</p>
          </section>

          <section className={cardClass} aria-labelledby="about">
            <h2 id="about" className="font-semibold text-text-primary">
              About the person answering
            </h2>
            <p className="mb-3 text-xs text-text-muted">Signed-in people get these filled in from their profile. Unlisted schools are sent for review.</p>
            <div className="space-y-2">
              {RESPONDENT_FIELDS.map((f) => (
                <div key={f} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-primary">{RESPONDENT_FIELD_LABELS[f]}</span>
                  <select
                    className={selectClass}
                    value={fields[f]}
                    onChange={(e) => edit(setFields)({ ...fields, [f]: e.target.value as FieldMode })}
                    aria-label={RESPONDENT_FIELD_LABELS[f]}
                  >
                    {(Object.keys(MODE_LABEL) as FieldMode[]).map((m) => (
                      <option key={m} value={m}>
                        {MODE_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <h2 className="pt-2 font-semibold text-text-primary">Questions</h2>
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              q={q}
              index={i}
              count={questions.length}
              answered={answered.ids.has(q.id)}
              answeredOptions={answered.options}
              disabled={working}
              onChange={(next) => setQuestionsDirty((qs) => qs.map((x) => (x.id === q.id ? next : x)))}
              onMove={(dir) =>
                setQuestionsDirty((qs) => {
                  const copy = [...qs];
                  const [item] = copy.splice(i, 1);
                  copy.splice(i + dir, 0, item);
                  return copy;
                })
              }
              onDuplicate={() =>
                setQuestionsDirty((qs) => {
                  const copy = [...qs];
                  copy.splice(i + 1, 0, {
                    ...q,
                    id: newId(),
                    required: hasAnswers ? false : q.required,
                    ...(q.options && { options: q.options.map((o) => ({ ...o, id: newId() })) }),
                  });
                  return copy;
                })
              }
              onRemove={() => setQuestionsDirty((qs) => qs.filter((x) => x.id !== q.id))}
            />
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className={`${secondaryButton} inline-flex flex-1 items-center justify-center gap-1.5 py-2.5`}
              onClick={() => setQuestionsDirty((qs) => [...qs, blankQuestion()])}
              disabled={working || questions.length >= LIMITS.questions}
            >
              <FiPlus aria-hidden /> Add question
            </button>
            <button
              type="button"
              className={`${secondaryButton} inline-flex items-center justify-center gap-1.5 py-2.5`}
              onClick={() => setImporting(true)}
              disabled={working || questions.length >= LIMITS.questions}
            >
              <FiClipboard aria-hidden /> Paste questions
            </button>
          </div>
          {importing && (
            <ImportQuestions
              existing={questions.length}
              hasAnswers={hasAnswers}
              onImport={(added) => setQuestionsDirty((qs) => [...qs, ...added])}
              onClose={() => setImporting(false)}
            />
          )}

          <section className={`${cardClass} flex flex-wrap items-center gap-3`} aria-label="More actions">
            <button type="button" className={secondaryButton} onClick={duplicate} disabled={working}>
              {busy === "duplicate" ? "Duplicating..." : "Duplicate as new survey"}
            </button>
            {!hasAnswers &&
              (confirmDelete ? (
                <span className="flex items-center gap-2 text-sm text-text-secondary">
                  Delete this survey for good?
                  <button type="button" className={dangerButton} onClick={remove} disabled={working}>
                    {busy === "delete" ? "Deleting..." : "Delete"}
                  </button>
                  <button type="button" className="text-text-secondary hover:text-text-primary" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </span>
              ) : (
                <button type="button" className={dangerButton} onClick={() => setConfirmDelete(true)} disabled={working}>
                  Delete
                </button>
              ))}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto" aria-label="Preview">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Preview</p>
            <h2 className="text-xl font-bold text-text-primary">{title || "Untitled survey"}</h2>
            {intro && <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{intro}</p>}
            {RESPONDENT_FIELDS.some((f) => fields[f] !== "off") && (
              <div className="mt-5 rounded-lg border border-border p-4">
                <p className="mb-2 text-sm font-semibold text-text-primary">About you</p>
                <ul className="space-y-1 text-sm text-text-secondary">
                  {RESPONDENT_FIELDS.filter((f) => fields[f] !== "off").map((f) => (
                    <li key={f}>
                      {RESPONDENT_FIELD_LABELS[f]}
                      {fields[f] === "required" ? <span className="text-red-600 dark:text-red-400"> *</span> : <span className="text-text-muted"> (optional)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5">
              {questions.length ? (
                <SurveyQuestions
                  questions={questions}
                  answers={previewAnswers}
                  onChange={(qid, v) =>
                    setPreviewAnswers((a) => {
                      const next = { ...a };
                      if (v === undefined) delete next[qid];
                      else next[qid] = v;
                      return next;
                    })
                  }
                />
              ) : (
                <p className="text-sm text-text-muted">Questions you add show up here.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AdminPageShell>
  );
}
