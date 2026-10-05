// components/survey/SurveyBanner.tsx
// Dashboard card inviting the user to an open survey they haven't
// answered. "Not now" hides that survey on this browser.
"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMessageSquare, FiX } from "react-icons/fi";
import { dismissSurvey, readDismissed, useOpenSurveys } from "./useOpenSurveys";

export function SurveyBanner() {
  const surveys = useOpenSurveys();
  const [hidden, setHidden] = useState<Set<string> | null>(null);
  // Dismissals are read once surveys arrive (browser storage, client only)
  const dismissed = hidden ?? (surveys.length ? readDismissed() : new Set<string>());
  const survey = surveys.find((s) => !dismissed.has(s.slug));
  if (!survey) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <FiMessageSquare className="mt-0.5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary">{survey.title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">Tell us what you think. It takes a few minutes and shapes what we build next.</p>
        <Link href={`/surveys/${survey.slug}`} className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90">
          Answer the survey
        </Link>
      </div>
      <button
        type="button"
        aria-label="Not now"
        title="Not now"
        className="text-text-muted hover:text-text-primary"
        onClick={() => {
          dismissSurvey(survey.slug);
          setHidden(new Set([...dismissed, survey.slug]));
        }}
      >
        <FiX aria-hidden />
      </button>
    </div>
  );
}
