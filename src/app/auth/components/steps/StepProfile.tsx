// components/auth/steps/StepProfile.tsx
// Name, username and school. The school is picked from the university
// catalog (GET /api/institutions/universities), the same list the profile
// page and UniLibrary use, so schools approved from suggestions and surveys
// show up here too. A school that isn't listed can be typed; the profile
// then asks for it (as a school suggestion) after signup.
"use client";

import { useState } from "react";
import AuthInput from "../UI/AuthInput";
import AuthButton from "../UI/AuthButton";
import UniversityCombobox from "@/components/profile/UniversityCombobox";
import type { SchoolChoice, SignUpFormData } from "../SignUpWizard";

// Same rule as school suggestions (api/institutions/suggest)
const SCHOOL_NAME = /^[\p{L}\p{N}\s.,'’&()\-/]{3,150}$/u;

interface StepProfileProps {
  firstName: string;
  lastName: string;
  username: string;
  school: SchoolChoice | null;
  onSchoolChange: (school: SchoolChoice | null) => void;
  onChange: (field: keyof SignUpFormData, value: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepProfile({
  firstName,
  lastName,
  username,
  school,
  onSchoolChange,
  onChange,
  onNext,
  onBack,
}: StepProfileProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const unlisted = !!school && !("id" in school);

  const handleContinue = () => {
    const newErrors: Record<string, string> = {};

   if (!firstName.trim()) newErrors.firstName = "Please enter your first name.";
   if (!lastName.trim()) newErrors.lastName = "Please enter your last name.";
   if (!username.trim()) {
     newErrors.username = "Please choose a username.";
   } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
     newErrors.username = "3-20 characters, letters/numbers/underscore only.";
   }
    if (!school) newErrors.school = "Please select your institution.";
    else if (unlisted && !SCHOOL_NAME.test(school.name.trim())) {
      newErrors.school = "Type your school's full name (letters, numbers and simple punctuation).";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) onNext();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">
          Tell us about yourself
        </h2>
        <p className="text-sm text-text-secondary">
          This is how others will find and recognize you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AuthInput
          name="firstName"
          label="First Name"
          type="text"
          placeholder="John"
          value={firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          error={errors.firstName}
          required
        />

        <AuthInput
          name="lastName"
          label="Last Name"
          type="text"
          placeholder="Doe"
          value={lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          error={errors.lastName}
          required
        />
      </div>

      <AuthInput
        name="username"
        label="Username"
        type="text"
        placeholder="johndoe"
        value={username}
        onChange={(e) => onChange("username", e.target.value)}
        error={errors.username}
        required
      />

      {unlisted ? (
        <div className="space-y-1.5">
          <AuthInput
            name="school"
            label="University / Institution"
            type="text"
            placeholder="Full name of your school"
            value={school.name}
            onChange={(e) => onSchoolChange({ name: e.target.value })}
            error={errors.school}
            required
          />
          <p className="text-xs text-text-muted">
            We&apos;ll ask for your faculty and department after signup and add your school to UniArchive.{" "}
            <button type="button" className="text-primary hover:underline" onClick={() => onSchoolChange(null)}>
              Search the list instead
            </button>
          </p>
        </div>
      ) : (
        <div>
          <UniversityCombobox
            value={school && "id" in school ? { id: school.id, name: school.name } : null}
            onChange={(u) => {
              onSchoolChange({ id: u._id, name: u.name, abbreviation: u.abbreviation, website: u.website });
              setErrors((prev) => ({ ...prev, school: "" }));
            }}
            onAddSchool={(name) => onSchoolChange({ name })}
            error={errors.school}
          />
          {!school && (
            <p className="mt-1.5 text-xs text-text-muted">
              Can&apos;t find it? Type its name and choose &ldquo;my school isn&apos;t listed&rdquo;.
            </p>
          )}
        </div>
      )}

      {onBack ? (
        <div className="flex gap-3">
          <AuthButton
            label="Back"
            type="button"
            variant="secondary"
            onClick={onBack}
          />
          <AuthButton label="Continue" type="button" onClick={handleContinue} />
        </div>
      ) : (
        <AuthButton label="Continue" type="button" onClick={handleContinue} />
      )}
    </div>
  );
}
