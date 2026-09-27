// src/lib/constants/submissions.ts
// Client-side constants for the UniLibrary submission flow.

/** sessionStorage flag set by /submit so /home can show a success banner. */
export const SUBMISSION_SUCCESS_KEY = "uniarchive-submission-success";

/** How often the submission form auto-saves a dirty draft. */
export const SUBMISSION_AUTOSAVE_MS = 60_000;

// Stored values for a submission's (and its Material's) level and semester.
// Here rather than in the model so client code can use them without Mongoose.
export const SUBMISSION_LEVELS = ["100", "200", "300", "400", "500", "PG", "Staff"] as const;
export const SUBMISSION_SEMESTERS = ["First", "Second", "Year-long"] as const;
