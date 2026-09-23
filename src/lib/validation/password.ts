// src/lib/validation/password.ts
// Server-side copy of the rules in app/auth/components/UI/PasswordRequiremnets.tsx.
// That file is a client component, so route handlers can't import from it;
// keep the two rule lists in sync.
const RULES: ((value: string) => boolean)[] = [
  (v) => v.length >= 8,
  (v) => /[A-Z]/.test(v),
  (v) => /[a-z]/.test(v),
  (v) => /\d/.test(v),
  (v) => /[@$!%*?&]/.test(v),
];

export const MAX_PASSWORD_LENGTH = 128;

export function isPasswordValid(value: string): boolean {
  return value.length <= MAX_PASSWORD_LENGTH && RULES.every((rule) => rule(value));
}
