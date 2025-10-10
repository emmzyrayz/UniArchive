import { ReactNode, ChangeEvent } from "react";

interface CheckboxProps {
  label?: string | ReactNode;
  checked?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  name?: string;
  id?: string;
  variant?: "standard" | "toggle";
}

export default function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  error,
  className = "",
  name,
  id,
  variant = "standard",
}: CheckboxProps) {
  const disabledStyles = disabled
    ? "opacity-50 cursor-not-allowed"
    : "cursor-pointer";

  // Standard Checkbox
  if (variant === "standard") {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className={`flex items-center gap-2 ${disabledStyles}`}>
          <input
            type="checkbox"
            name={name}
            id={id || name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={`
              w-5 h-5 rounded border-2 border-gray-300 
              text-indigo-600 
              focus:ring-2 focus:ring-indigo-100 focus:ring-offset-0
              transition-all duration-200
              cursor-pointer
              disabled:cursor-not-allowed
              ${error ? "border-red-500" : ""}
              ${className}
            `}
          />

          {label && (
            <label
              htmlFor={id || name}
              className={`text-sm font-medium text-black select-none ${
                disabled ? "" : "cursor-pointer"
              }`}
            >
              {label}
            </label>
          )}
        </div>

        {error && (
          <span className="text-red-500 text-sm font-medium ml-7">{error}</span>
        )}
      </div>
    );
  }

  // Toggle Switch
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className={`flex items-center gap-3 ${disabledStyles}`}>
        <label
          htmlFor={id || name}
          className="relative inline-flex items-center cursor-pointer"
        >
          <input
            type="checkbox"
            name={name}
            id={id || name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
          />
          <div
            className={`
              w-11 h-6 bg-gray-300 rounded-full peer 
              peer-focus:ring-2 peer-focus:ring-indigo-100
              peer-checked:after:translate-x-full 
              peer-checked:after:border-white 
              after:content-[''] 
              after:absolute 
              after:top-[2px] 
              after:left-[2px] 
              after:bg-white 
              after:border-gray-300 
              after:border 
              after:rounded-full 
              after:h-5 
              after:w-5 
              after:transition-all 
              peer-checked:bg-indigo-600
              ${error ? "peer-checked:bg-red-500" : ""}
              ${className}
            `}
          ></div>
        </label>

        {label && (
          <span
            className={`text-sm font-medium text-black select-none ${
              disabled ? "" : "cursor-pointer"
            }`}
            onClick={() => {
              if (!disabled && onChange) {
                const fakeEvent = {
                  target: { checked: !checked },
                } as ChangeEvent<HTMLInputElement>;
                onChange(fakeEvent);
              }
            }}
          >
            {label}
          </span>
        )}
      </div>

      {error && (
        <span className="text-red-500 text-sm font-medium">{error}</span>
      )}
    </div>
  );
}


// Usage Example

// // Standard checkbox
// <Checkbox
//   label="Remember me"
//   checked={remember}
//   onChange={(e) => setRemember(e.target.checked)}
// />

// // Required checkbox with error
// <Checkbox
//   label="I agree to the terms and conditions"
//   checked={agreed}
//   onChange={(e) => setAgreed(e.target.checked)}
//   error={!agreed ? "You must agree to continue" : ""}
// />

// // Disabled checkbox
// <Checkbox
//   label="Email notifications"
//   checked={true}
//   disabled={true}
// />

// // Toggle switch
// <Checkbox
//   variant="toggle"
//   label="Enable dark mode"
//   checked={darkMode}
//   onChange={(e) => setDarkMode(e.target.checked)}
// />

// // Toggle with error
// <Checkbox
//   variant="toggle"
//   label="Accept privacy policy"
//   checked={accepted}
//   onChange={(e) => setAccepted(e.target.checked)}
//   error={!accepted ? "Required" : ""}
// />

// // Checkbox list
// <div className="space-y-2">
//   <Checkbox label="Math" checked={subjects.math} onChange={...} />
//   <Checkbox label="Physics" checked={subjects.physics} onChange={...} />
//   <Checkbox label="Chemistry" checked={subjects.chemistry} onChange={...} />
// </div>