// src/lib/constants/submissions.ts
// Client-side constants for the UniLibrary submission flow.

/** sessionStorage flag set by /submit so /home can show a success banner. */
export const SUBMISSION_SUCCESS_KEY = "uniarchive-submission-success";

/** How often the submission form auto-saves a dirty draft. */
export const SUBMISSION_AUTOSAVE_MS = 60_000;
