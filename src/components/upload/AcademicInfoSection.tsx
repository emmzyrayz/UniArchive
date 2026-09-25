// src/components/upload/AcademicInfoSection.tsx
// Collapsible "Academic Info (optional)" block on the upload form. Values
// start from the user's profile; each can be cleared, and clearing a level
// of the university -> faculty -> department chain clears those below it.
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FiChevronRight, FiX } from "react-icons/fi";
import { PROFILE_LEVELS, PROFILE_SEMESTERS } from "@/lib/constants/profile";

export interface AcademicInfo {
  universityId?: string;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  level?: string;
  semester?: string;
}

interface Props {
  value: AcademicInfo;
  /** The profile's values, to label fields that still match it. */
  profile: AcademicInfo;
  onChange: (next: AcademicInfo) => void;
}

const SELECT_CLASS =
  "w-full px-4 py-2.5 border rounded-md text-sm text-text-primary bg-background border-border focus:ring-2 focus:ring-primary focus:border-primary";

function FromProfile({ show }: { show: boolean }) {
  return show ? <p className="text-xs text-text-muted mt-1">From your profile</p> : null;
}

function ChipField({
  label,
  text,
  fromProfile,
  onClear,
}: {
  label: string;
  text?: string;
  fromProfile: boolean;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="block text-sm font-medium text-text-secondary mb-1.5">{label}</p>
      {text ? (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-md border border-border bg-background">
          <span className="text-sm text-text-primary truncate">{text}</span>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="shrink-0 p-1 rounded text-text-muted hover:text-error"
          >
            <FiX size={14} />
          </button>
        </div>
      ) : (
        <p className="px-4 py-2.5 rounded-md border border-dashed border-border text-sm text-text-muted">
          Not set
        </p>
      )}
      <FromProfile show={!!text && fromProfile} />
    </div>
  );
}

export function AcademicInfoSection({ value, profile, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const universityText = value.universityName
    ? value.universityAbbr
      ? `${value.universityAbbr} — ${value.universityName}`
      : value.universityName
    : undefined;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start gap-2 px-4 py-3 text-left"
      >
        <FiChevronRight
          className={`mt-0.5 shrink-0 text-text-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span>
          <span className="block text-sm font-medium text-text-primary">
            Academic Info <span className="text-text-muted font-normal">(optional)</span>
          </span>
          <span className="block text-xs text-text-muted mt-0.5">
            Helps reviewers categorise your document
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border">
              {!profile.universityId && !value.universityId && (
                <p className="text-xs text-text-muted pt-3">
                  Set your university in your profile and it will fill in here automatically.
                </p>
              )}
              <div className="pt-3 space-y-4">
                <ChipField
                  label="University"
                  text={universityText}
                  fromProfile={value.universityId === profile.universityId}
                  onClear={() =>
                    onChange({
                      ...value,
                      universityId: undefined,
                      universityName: undefined,
                      universityAbbr: undefined,
                      facultyId: undefined,
                      facultyName: undefined,
                      departmentId: undefined,
                      departmentName: undefined,
                    })
                  }
                />
                <ChipField
                  label="Faculty"
                  text={value.facultyName}
                  fromProfile={value.facultyId === profile.facultyId}
                  onClear={() =>
                    onChange({
                      ...value,
                      facultyId: undefined,
                      facultyName: undefined,
                      departmentId: undefined,
                      departmentName: undefined,
                    })
                  }
                />
                <ChipField
                  label="Department"
                  text={value.departmentName}
                  fromProfile={value.departmentId === profile.departmentId}
                  onClear={() =>
                    onChange({ ...value, departmentId: undefined, departmentName: undefined })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="upload-level" className="block text-sm font-medium text-text-secondary mb-1.5">
                    Level
                  </label>
                  <select
                    id="upload-level"
                    value={value.level ?? ""}
                    onChange={(e) => onChange({ ...value, level: e.target.value || undefined })}
                    className={SELECT_CLASS}
                  >
                    <option value="">Not set</option>
                    {PROFILE_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <FromProfile show={!!value.level && value.level === profile.level} />
                </div>
                <div>
                  <label htmlFor="upload-semester" className="block text-sm font-medium text-text-secondary mb-1.5">
                    Semester
                  </label>
                  <select
                    id="upload-semester"
                    value={value.semester ?? ""}
                    onChange={(e) => onChange({ ...value, semester: e.target.value || undefined })}
                    className={SELECT_CLASS}
                  >
                    <option value="">Not set</option>
                    {PROFILE_SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <FromProfile show={!!value.semester && value.semester === profile.semester} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
