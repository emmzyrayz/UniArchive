// components/auth/steps/StepProfile.tsx
"use client";

import { useState } from "react";
import AuthInput from "../UI/AuthInput";
import AuthSelect from "../UI/AuthSelect";
import AuthButton from "../UI/AuthButton";
import universitiesData from "@/assets/data/schoolData";
import type { SignUpFormData } from "../SignUpWizard";

interface StepProfileProps {
  firstName: string;
  lastName: string;
  username: string;
  school: string;
  onChange: (field: keyof SignUpFormData, value: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepProfile({
  firstName,
  lastName,
  username,
  school,
  onChange,
  onNext,
  onBack,
}: StepProfileProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const uniqueSchools = Array.from(
    new Map(
      universitiesData.universities.map((s) => [
        s.name,
        { value: s.name, label: s.name },
      ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));

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

      <AuthSelect
        name="school"
        label="University / Institution"
        options={uniqueSchools}
        value={school}
        onChange={(e) => onChange("school", e.target.value)}
        error={errors.school}
        required
      />

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
