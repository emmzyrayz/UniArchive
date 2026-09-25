// src/lib/fuzzyMatch.ts
// Fuzzy name matching for institution suggestions, used to spot a submitted
// university/faculty/department that already exists under a slightly
// different spelling.
import { distance } from "fastest-levenshtein";

export type MatchKind = "university" | "unit";

// Words that carry no identity. Universities drop generic institution words;
// faculties and departments only drop the "Faculty of"/"Department of"
// framing, since words like "Science" or "Education" ARE their identity.
// "federal" and "state" are deliberately kept: without them "University of
// Lagos" and "Lagos State University" both normalise to "lagos".
const STOPWORDS: Record<MatchKind, RegExp> = {
  university:
    /\b(university|of|the|college|polytechnic|institute|technology|education|science|sciences|and)\b/g,
  unit: /\b(faculty|college|school|department|dept|of|the|and|in)\b/g,
};

// Normalise a name for comparison: lowercase, strip punctuation and stopwords.
export function normalise(name: string, kind: MatchKind = "university"): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(STOPWORDS[kind], " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Similarity score 0-100 (normalised Levenshtein). */
export function similarityScore(
  a: string,
  b: string,
  kind: MatchKind = "university",
): number {
  const na = normalise(a, kind);
  const nb = normalise(b, kind);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  return Math.round(((maxLen - distance(na, nb)) / maxLen) * 100);
}

export interface MatchCandidate {
  id: string;
  name: string;
  /** Exact (case-insensitive) abbreviation match scores 100, e.g. "UNIZIK". */
  abbreviation?: string;
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Score from which callers treat two names as the same institution. */
export const CERTAIN_MATCH = 85;

/** "Nnamdi Azikiwe University, Awka" -> "Nnamdi Azikiwe University". */
function withoutCity(name: string): string | null {
  const comma = name.lastIndexOf(",");
  return comma > 0 ? name.slice(0, comma) : null;
}

/** "Nnamdi Azikiwe University, Awka" -> "Awka". */
function cityOf(name: string): string | null {
  const comma = name.lastIndexOf(",");
  const city = comma > 0 ? name.slice(comma + 1).trim() : "";
  return city || null;
}

/**
 * Checks a submitted name against existing names. Returns matches at or
 * above `threshold`, best first.
 *
 * An exact abbreviation match ("UNIZIK") scores 100. For universities the
 * name without its trailing ", City" is also tried, since seeded names look
 * like "Nnamdi Azikiwe University, Awka" and students type "Nnamdi Azikiwe" —
 * but only when that shortened name is unique, so "Federal University" can't
 * match every "Federal University, <town>".
 */
export function findSimilar(
  submitted: string,
  existing: MatchCandidate[],
  threshold = 60,
  kind: MatchKind = "university",
): { id: string; name: string; score: number }[] {
  const baseCounts = new Map<string, number>();
  if (kind === "university") {
    for (const e of existing) {
      const base = withoutCity(e.name);
      if (!base) continue;
      const key = normalise(base, kind);
      baseCounts.set(key, (baseCounts.get(key) ?? 0) + 1);
    }
  }

  const submittedCity = kind === "university" ? cityOf(submitted) : null;

  const scoreOf = (e: MatchCandidate): number => {
    if (e.abbreviation && compact(submitted) === compact(e.abbreviation)) return 100;
    let best = similarityScore(submitted, e.name, kind);
    // "Federal University, Lafia" vs "Federal University, Zaria" differ by
    // two letters but are different schools: when both name a town and the
    // towns differ, never call it a certain match.
    const candidateCity = submittedCity ? cityOf(e.name) : null;
    if (
      submittedCity &&
      candidateCity &&
      similarityScore(submittedCity, candidateCity, "unit") < CERTAIN_MATCH
    ) {
      best = Math.min(best, CERTAIN_MATCH - 1);
    }
    const base = kind === "university" ? withoutCity(e.name) : null;
    if (base && baseCounts.get(normalise(base, kind)) === 1) {
      best = Math.max(best, similarityScore(submitted, base, kind));
    }
    return best;
  };

  return existing
    .map((e) => ({ id: e.id, name: e.name, score: scoreOf(e) }))
    .filter((e) => e.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
