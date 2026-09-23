// components/auth/UI/PasswordRequirements.tsx
"use client";

interface Rule {
  label: string;
  test: (value: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
  {
    label: "One special character (@$!%*?&)",
    test: (v) => /[@$!%*?&]/.test(v),
  },
];

interface PasswordRequirementsProps {
  value: string;
}

export function isPasswordValid(value: string): boolean {
  return RULES.every((rule) => rule.test(value));
}

export function PasswordRequirements({ value }: PasswordRequirementsProps) {
  return (
    <ul className="space-y-1.5">
      {RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-2 text-sm transition-colors duration-200 ${
              passed ? "text-success" : "text-text-muted"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                passed
                  ? "bg-success border-success text-white"
                  : "border-neutral-300 dark:border-neutral-500"
              }`}
            >
              {passed && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
