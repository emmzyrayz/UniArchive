// components/scouts/ScoutPlay.tsx
// /scouts/play?task=...: one Scout task at a time. The PDF fills the top
// on phones (left on computers) and the question sits below it (right).
// Skip passes on a task for this visit; after answering, the next loads.
// Voted tasks send the signed token that came with them; identify sends a
// Help identify suggestion, which our team accepts or not.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiSkipForward } from "react-icons/fi";
import type { ScoutTaskCard } from "@/lib/scouts/engine";
import {
  AGREE,
  CHECK_TYPED_ANSWERS,
  NEEDS_NOTE,
  NOTE_MAX,
  READABLE_ANSWERS,
  SCOUT_TASKS,
  type ScoutTask,
} from "@/lib/scouts/taskTypes";
import {
  AcademicFields,
  BasicsFields,
  EMPTY_MATERIAL_FORM,
  formFromSuggestion,
  materialBody,
  validateAcademic,
  validateBasics,
  type MaterialFormErrors,
  type MaterialFormState,
} from "@/components/submit/materialFields";
import { MathText } from "@/components/layer2/math";
import type { MaterialSuggestionsResponse } from "@/types/unilibrary";
import { ScoutPdf } from "./ScoutPdf";
import type { StreakState } from "@/lib/scouts/streaks";

type Load = { kind: "loading" } | { kind: "empty" } | { kind: "error"; message: string } | { kind: "ready"; card: ScoutTaskCard };
type Feedback = { tone: "good" | "info" | "bad"; text: string } | null;

const INTRO_KEY = (task: string) => `ua_scouts_intro_${task}`;
const INTROS: Record<ScoutTask, string> = {
  identify:
    "Look at the PDF and fill in what it is: course code, school, level and so on. Our team checks it, and you earn when they verify the PDF with your details.",
  readable:
    "Scroll through the PDF and say whether a student could study from it. When other Scouts agree with you, you earn.",
  check_typed:
    "Find this question in the PDF and compare it with what was typed: words, numbers, symbols and options. When other Scouts agree with you, you earn.",
};

function readIntroSeen(task: string): boolean {
  try {
    return localStorage.getItem(INTRO_KEY(task)) === "1";
  } catch {
    return true;
  }
}

const btn = "rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:opacity-50";

function AnswerButton({ label, hint, onClick, disabled, active }: { label: string; hint: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${btn} ${active ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/60"}`}
    >
      <span className="block font-semibold text-text-primary">{label}</span>
      <span className="block text-xs text-text-muted">{hint}</span>
    </button>
  );
}

function MaterialHeader({ card }: { card: ScoutTaskCard }) {
  const m = card.material;
  const facts = [m.kind, m.courseCode, m.school, m.level, m.pageCount && `${m.pageCount} pages`].filter(Boolean);
  return (
    <div>
      <p className="text-xs font-medium text-primary">{m.reason}</p>
      <p className="mt-0.5 font-semibold text-text-primary">{m.title}</p>
      <p className="text-xs text-text-muted">{facts.join(" · ")}</p>
    </div>
  );
}

/** Voted answers: readable and check_typed. */
function VotePanel({
  card,
  onAnswered,
  setFeedback,
  onStreak,
}: {
  card: Extract<ScoutTaskCard, { task: "readable" | "check_typed" }>;
  onAnswered: () => void;
  setFeedback: (f: Feedback) => void;
  onStreak: (s: StreakState) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const options = card.task === "readable" ? READABLE_ANSWERS : CHECK_TYPED_ANSWERS;

  const send = async (answer: string) => {
    if (NEEDS_NOTE.has(answer) && note.trim().length < 3) {
      setPicked(answer);
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/scouts/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: card.token, answer, note: NEEDS_NOTE.has(answer) ? note : undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ tone: "bad", text: data?.message ?? "Couldn't send that." });
        // Too soon: stay on this task; anything else: move on
        if (res.status !== 425) onAnswered();
        return;
      }
      if (data.streak) onStreak(data.streak);
      const s = data.settled;
      if (data.dayCompleted) setFeedback({ tone: "good", text: `Today's ${data.streak.perDay} tasks done: you're on a ${data.streak.current}-day streak.` });
      else if (s?.stuck) setFeedback({ tone: "info", text: "Saved. Scouts couldn't agree on this one, so our team will decide." });
      else if (s?.youAgreed) setFeedback({ tone: "good", text: s.paid ? "Settled, and you agreed: credits added to your wallet." : "Settled, and you agreed." });
      else if (s) setFeedback({ tone: "info", text: "Settled: other Scouts saw it differently, so no credits this time." });
      else if (!data.counted) setFeedback({ tone: "info", text: "Saved. Your answers aren't counting for now (see your accuracy on the Scouts page)." });
      else setFeedback({ tone: "good", text: `Saved. You'll earn when ${AGREE} Scouts agree.` });
      onAnswered();
    } catch {
      setFeedback({ tone: "bad", text: "You seem to be offline. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {card.task === "check_typed" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Question {card.question.number}
            {card.question.marks !== undefined && ` · ${card.question.marks} marks`}
          </p>
          <MathText text={card.question.text} className="mt-2 text-sm text-text-primary" />
          {card.question.options && (
            <ul className="mt-2 space-y-1 text-sm text-text-primary">
              {card.question.options.map((o) => (
                <li key={o.label} className="flex gap-2">
                  <span className="font-semibold">{o.label}.</span>
                  <MathText text={o.text} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-sm font-medium text-text-primary">
        {card.task === "readable" ? "Could a student study from this PDF?" : "Does it match the paper?"}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(options).map(([value, o]) => (
          <AnswerButton key={value} label={o.label} hint={o.hint} disabled={busy} active={picked === value} onClick={() => send(value)} />
        ))}
      </div>
      {picked && NEEDS_NOTE.has(picked) && (
        <div className="space-y-2">
          <label htmlFor="scout-note" className="text-sm text-text-secondary">
            What&apos;s wrong? (shown to the person who typed it)
          </label>
          <textarea
            id="scout-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            rows={3}
            placeholder="e.g. 'x^2' should be 'x^3'; option C is missing"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          />
          <button
            type="button"
            disabled={busy || note.trim().length < 3}
            onClick={() => send(picked)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

/** Identify: a Help identify suggestion for the PDF. */
function IdentifyPanel({ materialId, onAnswered, setFeedback }: { materialId: string; onAnswered: () => void; setFeedback: (f: Feedback) => void }) {
  const [form, setForm] = useState<MaterialFormState>(EMPTY_MATERIAL_FORM);
  const [errors, setErrors] = useState<MaterialFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/materials/${materialId}/suggestions`, { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<MaterialSuggestionsResponse>) : null))
      .then((data) => {
        if (data) setForm(formFromSuggestion(data.prefill));
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => controller.abort();
  }, [materialId]);

  const update = useCallback(<K extends keyof MaterialFormState>(key: K, value: MaterialFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  const send = async () => {
    const found = { ...validateBasics(form), ...validateAcademic(form) };
    setErrors(found);
    if (Object.keys(found).length) {
      setFeedback({ tone: "bad", text: "Some details need another look." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/materials/${materialId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(materialBody(form)),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ tone: "bad", text: data?.message ?? "Couldn't send it." });
        if (res.status === 409) onAnswered();
        return;
      }
      setFeedback({ tone: "good", text: "Sent. You'll earn when our team verifies the PDF with your details." });
      onAnswered();
    } catch {
      setFeedback({ tone: "bad", text: "You seem to be offline. Try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <p className="text-sm text-text-muted">Loading the form…</p>;
  return (
    <div className="space-y-4">
      <BasicsFields form={form} errors={errors} update={update} idPrefix="scout" />
      <AcademicFields form={form} errors={errors} update={update} setForm={setForm} idPrefix="scout" />
      <button type="button" onClick={send} disabled={busy} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Sending…" : "Send these details"}
      </button>
    </div>
  );
}

export function ScoutPlay({ task }: { task: ScoutTask }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [skipped, setSkipped] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [round, setRound] = useState(0);
  const [introSeen, setIntroSeen] = useState(true);
  const [streak, setStreak] = useState<StreakState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams({ task, ...(skipped.length ? { skip: skipped.join(",") } : {}) });
    fetch(`/api/scouts/next?${qs}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? "Couldn't load a task.");
        setLoad(data.card ? { kind: "ready", card: data.card } : { kind: "empty" });
        setIntroSeen(readIntroSeen(task));
      })
      .catch((e: Error) => e.name !== "AbortError" && setLoad({ kind: "error", message: e.message }));
    return () => controller.abort();
  }, [task, skipped, round]);

  const def = SCOUT_TASKS[task];
  const card = load.kind === "ready" ? load.card : null;
  const subjectId = card ? (card.task === "check_typed" ? card.question.questionId : card.material.materialId) : null;
  const next = () => {
    setLoad({ kind: "loading" });
    setRound((r) => r + 1);
  };
  const skip = () => {
    if (!subjectId) return;
    setFeedback(null);
    setLoad({ kind: "loading" });
    setSkipped((s) => [...s, subjectId].slice(-50));
  };
  const dismissIntro = () => {
    setIntroSeen(true);
    try {
      localStorage.setItem(INTRO_KEY(task), "1");
    } catch {
      // Shown again next time; fine
    }
  };

  return (
    <main className="mt-[70px] min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/scouts" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
            <FiArrowLeft aria-hidden /> Scouts
          </Link>
          <h1 className="truncate text-base font-semibold text-text-primary">
            <span aria-hidden>{def.icon}</span> {def.title}
            {streak && streak.current > 0 && (
              <span className="ml-2 text-sm font-normal text-text-secondary" title="Your streak">
                🔥 {streak.current}
                {streak.multiplier > 1 && ` · ×${streak.multiplier}`}
              </span>
            )}
          </h1>
          <button
            type="button"
            onClick={skip}
            disabled={!card}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            Skip <FiSkipForward aria-hidden />
          </button>
        </div>

        {feedback && (
          <p
            role="status"
            className={`mb-3 rounded-lg p-3 text-sm ${
              feedback.tone === "good"
                ? "bg-green-500/10 text-green-800 dark:text-green-300"
                : feedback.tone === "bad"
                  ? "bg-red-500/10 text-red-700 dark:text-red-400"
                  : "bg-primary/10 text-text-primary"
            }`}
          >
            {feedback.text}
          </p>
        )}

        {!introSeen && card && (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-text-primary">
            <p>{INTROS[task]}</p>
            <button type="button" onClick={dismissIntro} className="shrink-0 font-semibold text-primary">
              Got it
            </button>
          </div>
        )}

        {load.kind === "loading" && <p className="py-16 text-center text-sm text-text-muted">Finding a task near you…</p>}
        {load.kind === "error" && <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">{load.message}</p>}
        {load.kind === "empty" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-lg font-semibold text-text-primary">All done for now</p>
            <p className="mt-1 text-sm text-text-secondary">
              {skipped.length ? "Nothing else here apart from the ones you skipped." : "There's nothing waiting for you here."} Try
              another task, or come back later.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {skipped.length > 0 && (
                <button type="button" onClick={() => setSkipped([])} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary">
                  Show skipped again
                </button>
              )}
              <Link href="/scouts" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                Back to Scouts
              </Link>
            </div>
          </div>
        )}

        {card && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="h-[55vh] overflow-hidden rounded-xl border border-border bg-surface lg:h-[calc(100vh-170px)]">
              <ScoutPdf bookId={card.material.bookId} />
            </div>
            <div className="min-w-0 space-y-4 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto">
              <MaterialHeader card={card} />
              {card.task === "identify" ? (
                <IdentifyPanel key={card.material.materialId} materialId={card.material.materialId} onAnswered={next} setFeedback={setFeedback} />
              ) : (
                <VotePanel key={subjectId} card={card} onAnswered={next} setFeedback={setFeedback} onStreak={setStreak} />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
