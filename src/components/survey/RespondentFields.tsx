// components/survey/RespondentFields.tsx
// The "About you" part of a survey. The school, faculty and department come
// from the catalog, with a "not listed" option at each step; typed names
// are sent for review and added to UniArchive (lib/survey/respond.ts).
"use client";

import UniversityCombobox from "@/components/profile/UniversityCombobox";
import { useInstitutionOptions } from "@/components/profile/useInstitutionOptions";
import {
  RESPONDENT_ROLES,
  SURVEY_LEVELS,
  type RespondentConfig,
  type RespondentField,
  type RespondentInput,
} from "@/lib/survey/questions";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60";
const label = "mb-1 block text-sm font-medium text-text-primary";
const OTHER = "__other";

function FieldLabel({ htmlFor, text, mode }: { htmlFor?: string; text: string; mode: RespondentConfig[RespondentField] }) {
  return (
    <label htmlFor={htmlFor} className={label}>
      {text}
      {mode === "required" ? <span className="text-red-600 dark:text-red-400"> *</span> : <span className="font-normal text-text-muted"> (optional)</span>}
    </label>
  );
}

function SchoolFields({
  value,
  onChange,
  mode,
  error,
}: {
  value: RespondentInput;
  onChange: (patch: Partial<RespondentInput>) => void;
  mode: RespondentConfig["school"];
  error?: string;
}) {
  const faculties = useInstitutionOptions(value.universityId ? `/api/institutions/faculties?universityId=${value.universityId}` : null, "faculties");
  const departments = useInstitutionOptions(
    value.universityId && value.facultyId
      ? `/api/institutions/departments?facultyId=${value.facultyId}&universityId=${value.universityId}`
      : null,
    "departments",
  );
  // A typed faculty/department under a listed school ("not listed" picked)
  const typingFaculty = !!value.universityId && !value.facultyId && value.facultyName !== undefined;
  const typingDepartment = !!value.facultyId && !value.departmentId && value.departmentName !== undefined;
  const clearBelowSchool = { facultyId: undefined, facultyName: undefined, departmentId: undefined, departmentName: undefined };

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Your school</legend>
      {value.schoolUnlisted ? (
        <div>
          <FieldLabel htmlFor="r-uni" text="University" mode={mode} />
          <input
            id="r-uni"
            className={input}
            value={value.universityName ?? ""}
            maxLength={150}
            onChange={(e) => onChange({ universityName: e.target.value })}
          />
          <p className="mt-1 text-xs text-text-muted">
            We&apos;ll check it and add it to UniArchive.{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => onChange({ schoolUnlisted: undefined, universityName: undefined, ...clearBelowSchool })}
            >
              Pick from the list instead
            </button>
          </p>
        </div>
      ) : (
        <div>
          <UniversityCombobox
            value={value.universityId ? { id: value.universityId, name: value.universityName ?? "" } : null}
            onChange={(u) => onChange({ universityId: u._id, universityName: u.name, ...clearBelowSchool })}
            onAddSchool={(name) => onChange({ schoolUnlisted: true, universityId: undefined, universityName: name, ...clearBelowSchool })}
          />
          {mode === "optional" && <p className="mt-1 text-xs text-text-muted">Optional.</p>}
        </div>
      )}

      {(value.universityId || value.schoolUnlisted) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="r-faculty" className={label}>
              Faculty
            </label>
            {value.universityId && !typingFaculty ? (
              <select
                id="r-faculty"
                className={input}
                value={value.facultyId ?? ""}
                disabled={faculties.loading}
                onChange={(e) => {
                  const v = e.target.value;
                  const f = faculties.items.find((o) => o._id === v);
                  onChange(
                    v === OTHER
                      ? { facultyId: undefined, facultyName: "", departmentId: undefined, departmentName: "" }
                      : { facultyId: f?._id, facultyName: f?.name, departmentId: undefined, departmentName: undefined },
                  );
                }}
              >
                <option value="">{faculties.loading ? "Loading..." : "Choose your faculty"}</option>
                {faculties.items.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                  </option>
                ))}
                <option value={OTHER}>My faculty isn&apos;t listed</option>
              </select>
            ) : (
              <>
                <input
                  id="r-faculty"
                  className={input}
                  value={value.facultyName ?? ""}
                  maxLength={150}
                  placeholder="e.g. Faculty of Engineering"
                  onChange={(e) => onChange({ facultyName: e.target.value })}
                />
                {typingFaculty && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-primary hover:underline"
                    onClick={() => onChange({ facultyName: undefined, departmentName: undefined })}
                  >
                    Pick from the list instead
                  </button>
                )}
              </>
            )}
          </div>
          <div>
            <label htmlFor="r-department" className={label}>
              Department
            </label>
            {value.facultyId && !typingDepartment ? (
              <select
                id="r-department"
                className={input}
                value={value.departmentId ?? ""}
                disabled={departments.loading}
                onChange={(e) => {
                  const v = e.target.value;
                  const d = departments.items.find((o) => o._id === v);
                  onChange(v === OTHER ? { departmentId: undefined, departmentName: "" } : { departmentId: d?._id, departmentName: d?.name });
                }}
              >
                <option value="">{departments.loading ? "Loading..." : "Choose your department"}</option>
                {departments.items.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                  </option>
                ))}
                <option value={OTHER}>My department isn&apos;t listed</option>
              </select>
            ) : (
              <>
                <input
                  id="r-department"
                  className={input}
                  value={value.departmentName ?? ""}
                  maxLength={150}
                  placeholder={value.universityId && !value.facultyId && !typingFaculty ? "Choose your faculty first" : "e.g. Computer Science"}
                  disabled={!!value.universityId && !value.facultyId && !typingFaculty}
                  onChange={(e) => onChange({ departmentName: e.target.value })}
                />
                {typingDepartment && (
                  <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => onChange({ departmentName: undefined })}>
                    Pick from the list instead
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {(value.schoolUnlisted || typingFaculty || typingDepartment) && (
        <p className="text-xs text-text-muted">Names you type are checked by our team and added to UniArchive for everyone.</p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </fieldset>
  );
}

export function RespondentFields({
  config,
  value,
  onChange,
  errors,
}: {
  config: RespondentConfig;
  value: RespondentInput;
  onChange: (patch: Partial<RespondentInput>) => void;
  errors: Record<string, string>;
}) {
  const err = (f: RespondentField) =>
    errors[`about.${f}`] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[`about.${f}`]}</p>;
  return (
    <div className="space-y-4">
      {config.name !== "off" && (
        <div>
          <FieldLabel htmlFor="r-name" text="Name" mode={config.name} />
          <input id="r-name" className={input} value={value.name ?? ""} maxLength={100} autoComplete="name" onChange={(e) => onChange({ name: e.target.value })} />
          {err("name")}
        </div>
      )}
      {config.email !== "off" && (
        <div>
          <FieldLabel htmlFor="r-email" text="Email" mode={config.email} />
          <input
            id="r-email"
            type="email"
            className={input}
            value={value.email ?? ""}
            maxLength={254}
            autoComplete="email"
            onChange={(e) => onChange({ email: e.target.value })}
          />
          <p className="mt-1 text-xs text-text-muted">Only so we can follow up on your answers. Never shown to anyone.</p>
          {err("email")}
        </div>
      )}
      {config.role !== "off" && (
        <div>
          <FieldLabel htmlFor="r-role" text="I am" mode={config.role} />
          <select id="r-role" className={input} value={value.role ?? ""} onChange={(e) => onChange({ role: e.target.value || undefined })}>
            <option value="">Choose...</option>
            {RESPONDENT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {err("role")}
        </div>
      )}
      {config.school !== "off" && <SchoolFields value={value} onChange={onChange} mode={config.school} error={errors["about.school"]} />}
      {config.level !== "off" && (
        <div>
          <FieldLabel htmlFor="r-level" text="Level" mode={config.level} />
          <select id="r-level" className={`${input} max-w-48`} value={value.level ?? ""} onChange={(e) => onChange({ level: e.target.value || undefined })}>
            <option value="">Choose...</option>
            {SURVEY_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === "PG" ? "Postgraduate" : l}
              </option>
            ))}
          </select>
          {err("level")}
        </div>
      )}
    </div>
  );
}
