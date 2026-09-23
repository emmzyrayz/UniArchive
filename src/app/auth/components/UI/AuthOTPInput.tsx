// components/auth/UI/OTPInput.tsx
"use client";

import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";

interface OTPInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function OTPInput({ length, value, onChange, error }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const setDigit = (index: number, digit: string) => {
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    onChange(nextDigits.join("").slice(0, length));
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    const char = raw.slice(-1);
    setDigit(index, char);
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const lastFilledIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex w-full gap-1.5 sm:gap-2 md:gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-9 h-11 sm:w-11 sm:h-13 md:w-14 md:h-16 text-center text-xl font-semibold rounded-md md:rounded-md lg:rounded-lg border bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              ${error ? "border-error" : "border-neutral-300 dark:border-neutral-500"}
            `}
          />
        ))}
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}