// components/auth/UI/PasswordFields.tsx
"use client";

import { useState } from "react";
import AuthInput from "./AuthInput";
import { PasswordRequirements, isPasswordValid } from "./PasswordRequiremnets";

interface PasswordFieldsProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  errors: { password?: string; confirmPassword?: string };
}

export function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  errors,
}: PasswordFieldsProps) {
  return (
    <>
      <div className="space-y-3">
        <AuthInput
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          error={errors.password}
          required
        />
        <PasswordRequirements value={password} />
      </div>

      <AuthInput
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
        error={errors.confirmPassword}
        required
      />
    </>
  );
}

export { isPasswordValid };
