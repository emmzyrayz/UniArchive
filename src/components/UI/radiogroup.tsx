import { ChangeEvent } from "react";

interface RadioGroupProps {
  label?: string;
  name: string;
  options: Array<{ value: string; label: string; description?: string }>;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  direction?: "horizontal" | "vertical";
}

export default function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
  className = "",
  direction = "vertical",
}: RadioGroupProps) {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Label */}
      {label && (
        <span className="text-sm font-medium text-black flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      )}

      {/* Radio Options */}
      <div
        className={`flex ${
          direction === "horizontal"
            ? "flex-row flex-wrap gap-4"
            : "flex-col gap-2"
        }`}
      >
        {options.map((opt, index) => {
          const isChecked = value === opt.value;
          const radioId = `${name}-${opt.value}-${index}`;

          return (
            <label
              key={radioId}
              htmlFor={radioId}
              className={`
                flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-200
                ${
                  isChecked
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }
                ${error ? "border-red-500" : ""}
                ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-gray-50"
                }
              `}
            >
              <input
                id={radioId}
                type="radio"
                name={name}
                value={opt.value}
                checked={isChecked}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onChange?.(e.target.value)
                }
                disabled={disabled}
                className="
                  w-5 h-5 mt-0.5 text-indigo-600 border-gray-300 
                  focus:ring-2 focus:ring-indigo-100 focus:ring-offset-0
                  cursor-pointer
                  disabled:cursor-not-allowed
                "
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-black">
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="text-xs text-gray-500">
                    {opt.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Footer: Helper text or Error */}
      <div className="min-h-[20px]">
        {error && (
          <span className="text-red-500 text-sm font-medium">{error}</span>
        )}
        {!error && helperText && (
          <span className="text-gray-500 text-sm">{helperText}</span>
        )}
      </div>
    </div>
  );
}


// usage Example
// import { useState } from "react";

// // Basic usage
// const [gender, setGender] = useState<string>("");

// <RadioGroup
//   label="Gender"
//   name="gender"
//   options={[
//     { value: "male", label: "Male" },
//     { value: "female", label: "Female" },
//     { value: "other", label: "Other" },
//   ]}
//   value={gender}
//   onChange={(value) => setGender(value)}
// />

// // Horizontal layout
// <RadioGroup
//   label="Course Level"
//   name="level"
//   direction="horizontal"
//   options={[
//     { value: "beginner", label: "Beginner" },
//     { value: "intermediate", label: "Intermediate" },
//     { value: "advanced", label: "Advanced" },
//   ]}
//   value={level}
//   onChange={setLevel}
// />

// // With descriptions
// <RadioGroup
//   label="Subscription Plan"
//   name="plan"
//   required
//   options={[
//     { 
//       value: "free", 
//       label: "Free Plan", 
//       description: "Access to basic courses" 
//     },
//     { 
//       value: "pro", 
//       label: "Pro Plan", 
//       description: "Unlimited access to all courses" 
//     },
//     { 
//       value: "enterprise", 
//       label: "Enterprise", 
//       description: "Custom solutions for organizations" 
//     },
//   ]}
//   value={plan}
//   onChange={setPlan}
//   error={!plan ? "Please select a plan" : ""}
// />

// // With helper text
// <RadioGroup
//   label="Preferred Learning Style"
//   name="style"
//   helperText="Choose the format that works best for you"
//   options={[
//     { value: "video", label: "Video Tutorials" },
//     { value: "reading", label: "Reading Materials" },
//     { value: "interactive", label: "Interactive Exercises" },
//   ]}
//   value={style}
//   onChange={setStyle}
// />