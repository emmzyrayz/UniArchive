// components/survey/useOpenSurveys.ts
// Open surveys for the visitor (GET /api/surveys/open), with whether
// they've answered each. Used by the ribbon and the dashboard banner.
"use client";

import { useEffect, useState } from "react";
import type { OpenSurveysResponse } from "@/types/survey";

export type OpenSurvey = OpenSurveysResponse["surveys"][number];

const DISMISSED = "ua:survey-dismissed";

/** Slugs this browser said "not now" to (best effort; storage may be off). */
export function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function dismissSurvey(slug: string) {
  try {
    const all = readDismissed();
    all.add(slug);
    localStorage.setItem(DISMISSED, JSON.stringify([...all].slice(-50)));
  } catch {
    // Storage blocked: the banner just comes back next time
  }
}

/** Unanswered open surveys, or [] while loading or on error. */
export function useOpenSurveys(): OpenSurvey[] {
  const [surveys, setSurveys] = useState<OpenSurvey[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/surveys/open", { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<OpenSurveysResponse>) : { surveys: [] }))
      .then((data) => setSurveys(data.surveys.filter((s) => !s.answered)))
      .catch(() => {
        // Surveys are optional extras: stay quiet when they can't load
      });
    return () => controller.abort();
  }, []);
  return surveys;
}
