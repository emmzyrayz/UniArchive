// src/lib/constants/materialReports.ts
// Why a reader reports a UniLibrary material (client-safe; the model and
// the report dialog share it).
export const MATERIAL_REPORT_REASONS = [
  { value: "wrong_details", label: "The details are wrong" },
  { value: "not_academic", label: "It isn't study material" },
  { value: "copyright", label: "It shouldn't be shared (copyright)" },
  { value: "broken", label: "The file is broken or unreadable" },
  { value: "other", label: "Something else" },
] as const;
export type MaterialReportReason = (typeof MATERIAL_REPORT_REASONS)[number]["value"];
