// src/lib/scouts/taskTypes.ts
// The Archive Scouts task types and their answers. Client-safe: the hub and
// the task cards read it too. Rewards live in the economy module
// (lib/economy/modules/scouts.ts) so admins can change them.
export const SCOUT_TASKS = {
  identify: {
    title: "Identify a PDF",
    short: "Identify",
    description: "Tell us what a new PDF is: course, school, level. Paid when our team verifies it with your details.",
    icon: "🕵️",
  },
  readable: {
    title: "Is this readable?",
    short: "Readable?",
    description: "Look through a PDF and say whether students can read it. Paid when other Scouts agree.",
    icon: "🔎",
  },
  check_typed: {
    title: "Check a typed answer",
    short: "Check typing",
    description: "Compare a typed past question with the paper. Paid when other Scouts agree.",
    icon: "✅",
  },
} as const;

export type ScoutTask = keyof typeof SCOUT_TASKS;
export const SCOUT_TASK_IDS = Object.keys(SCOUT_TASKS) as ScoutTask[];

/** Tasks answered by vote (identify goes through Help identify suggestions instead). */
export const VOTED_TASKS = ["readable", "check_typed"] as const;
export type VotedTask = (typeof VOTED_TASKS)[number];
export const isVotedTask = (t: unknown): t is VotedTask => VOTED_TASKS.includes(t as VotedTask);

export const READABLE_ANSWERS = {
  readable: { label: "Readable", hint: "Clear enough to study from" },
  hard_to_read: { label: "Hard to read", hint: "Blurry, faint or skewed, but usable" },
  unreadable: { label: "Unreadable or wrong pages", hint: "Can't be read, blank, or pages missing" },
  not_study: { label: "Not study material", hint: "Not a paper, notes or a book" },
} as const;

export const CHECK_TYPED_ANSWERS = {
  correct: { label: "Matches the paper", hint: "Same words, numbers and options" },
  mistakes: { label: "Has mistakes", hint: "Say what's wrong" },
  wrong_question: { label: "Wrong question", hint: "Not on this paper, or a different number" },
} as const;

export type ReadableAnswer = keyof typeof READABLE_ANSWERS;
export type CheckTypedAnswer = keyof typeof CHECK_TYPED_ANSWERS;

export const ANSWERS: Record<VotedTask, readonly string[]> = {
  readable: Object.keys(READABLE_ANSWERS),
  check_typed: Object.keys(CHECK_TYPED_ANSWERS),
};

/** Answers that need a note saying what's wrong. */
export const NEEDS_NOTE = new Set(["mistakes", "wrong_question"]);
export const NOTE_MAX = 300;

// Consensus: a subject settles when AGREE answers match; if MAX_ANSWERS
// come in without that, it's "stuck" and left to staff.
export const AGREE = 3;
export const MAX_ANSWERS = 7;

// Accuracy: after MIN_SETTLED settled answers of a type, someone below
// MIN_ACCURACY has their answers stop counting (and earning) until staff
// look; they keep answering, so it can recover.
export const MIN_SETTLED = 20;
export const MIN_ACCURACY = 0.6;

// An answer sent sooner than this after the task was shown wasn't read
export const MIN_SECONDS = 4;
export const TOKEN_TTL_SECONDS = 60 * 60;
