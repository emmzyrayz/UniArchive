// components/survey/SurveyForm.tsx
// The public survey form (/surveys/[slug]). Checks answers with the same
// code as the server (lib/survey/questions.ts) before sending, shows the
// thank-you message after, and lets people come back and change their
// answers until the survey closes.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cleanAnswers, cleanRespondent, type AnswerValue, type Answers, type RespondentInput } from "@/lib/survey/questions";
import type { OwnResponseDto, PublicSurveyDto } from "@/lib/survey/public";
import { SurveyQuestions } from "./SurveyQuestions";
import { RespondentFields } from "./RespondentFields";

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export function SurveyForm({
  survey,
  own,
  prefill,
  signedIn,
}: {
  survey: PublicSurveyDto;
  own: OwnResponseDto | null;
  prefill: RespondentInput;
  signedIn: boolean;
}) {
  const [respondent, setRespondent] = useState<RespondentInput>(own?.respondent ?? prefill);
  const [answers, setAnswers] = useState<Answers>(own?.answers ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<"new" | "updated" | null>(null);
  const [answeredAt, setAnsweredAt] = useState(own?.updatedAt ?? null);
  const [website, setWebsite] = useState("");
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const showsAbout = Object.values(survey.respondentFields).some((m) => m !== "off");

  const scrollToFirstError = (errs: Record<string, string>) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const el = document.getElementById(first.startsWith("about.") ? "about-you" : `q-${first}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const who = cleanRespondent(survey.respondentFields, respondent);
    const what = cleanAnswers(survey.questions, answers);
    const local = {
      ...Object.fromEntries(Object.entries(who.errors).map(([k, v]) => [`about.${k}`, v])),
      ...what.errors,
    };
    setErrors(local);
    if (Object.keys(local).length) {
      setMessage("Some answers need another look.");
      scrollToFirstError(local);
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/surveys/${survey.slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondent, answers, startedAt: startedAt.current, website }),
      });
      const data = (await res.json().catch(() => null)) as { created?: boolean; message?: string; errors?: Record<string, string> } | null;
      if (!res.ok) {
        setErrors(data?.errors ?? {});
        setMessage(data?.message ?? `Couldn't send your answers (HTTP ${res.status}). Try again.`);
        if (data?.errors) scrollToFirstError(data.errors);
        return;
      }
      setDone(data?.created ? "new" : "updated");
      setAnsweredAt(new Date().toISOString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessage("You seem to be offline. Your answers are still here; send them again when you're connected.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-2 text-xl font-bold text-text-primary">{done === "new" ? "Thank you!" : "Your answers were updated"}</h2>
        <p className="mx-auto mt-2 max-w-prose whitespace-pre-line text-text-secondary">
          {survey.thankYouMessage || "Your answers help us make UniArchive better for every student."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm">
          <button type="button" className="rounded-lg border border-border px-4 py-2 font-medium text-text-primary hover:bg-surface" onClick={() => setDone(null)}>
            Change my answers
          </button>
          <Link href="/unilibrary" className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary/90">
            Browse UniLibrary
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {answeredAt && (
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-text-secondary">
          You answered this survey on {dateFormat.format(new Date(answeredAt))}. Change anything below and send it again to update your answers.
        </p>
      )}
      {showsAbout && (
        <section id="about-you" className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6" aria-labelledby="about-title">
          <h2 id="about-title" className="font-semibold text-text-primary">
            About you
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            {signedIn ? "Filled in from your profile. Change anything that's out of date." : "So we know who's answering. Nothing here is shown publicly."}
          </p>
          <RespondentFields
            config={survey.respondentFields}
            value={respondent}
            onChange={(patch) => setRespondent((r) => ({ ...r, ...patch }))}
            errors={errors}
          />
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6" aria-label="Questions">
        <SurveyQuestions
          questions={survey.questions}
          answers={answers}
          errors={errors}
          onChange={(id, v: AnswerValue | undefined) =>
            setAnswers((a) => {
              const next = { ...a };
              if (v === undefined) delete next[id];
              else next[id] = v;
              return next;
            })
          }
          disabled={sending}
        />
      </section>

      {/* Left empty by people; bots fill every field */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={sending} className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
          {sending ? "Sending..." : answeredAt ? "Update my answers" : "Send my answers"}
        </button>
        {!signedIn && <p className="text-xs text-text-muted">You can come back on this device and change your answers until the survey closes.</p>}
      </div>
    </form>
  );
}
