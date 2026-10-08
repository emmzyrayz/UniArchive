// src/lib/scouts/consensus.ts
// When a voted Scout task is decided. Pure, so it's unit-tested on its own.
import { AGREE, MAX_ANSWERS, MIN_ACCURACY, MIN_SETTLED } from "./taskTypes";

export type Consensus = { kind: "open" } | { kind: "settled"; value: string } | { kind: "stuck" };

/**
 * `answers` are the counted answers so far. Settled when AGREE of them
 * match (the first value to get there); stuck when MAX_ANSWERS are in
 * without that; otherwise still open.
 */
export function decideConsensus(answers: string[], agree = AGREE, max = MAX_ANSWERS): Consensus {
  const counts = new Map<string, number>();
  for (const a of answers) {
    const n = (counts.get(a) ?? 0) + 1;
    counts.set(a, n);
    if (n >= agree) return { kind: "settled", value: a };
  }
  return answers.length >= max ? { kind: "stuck" } : { kind: "open" };
}

export interface Accuracy {
  settled: number;
  confirmed: number;
  /** confirmed / settled, or null before anything settled */
  rate: number | null;
  /** Answers stop counting: enough settled and too few right */
  paused: boolean;
}

export function accuracyOf(confirmed: number, disagreed: number): Accuracy {
  const settled = confirmed + disagreed;
  const rate = settled ? confirmed / settled : null;
  return { settled, confirmed, rate, paused: settled >= MIN_SETTLED && (rate ?? 1) < MIN_ACCURACY };
}
