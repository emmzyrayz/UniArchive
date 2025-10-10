
import { ChangeEvent, ReactElement } from "react";

interface TextareaProps {
  label?: string;
  placeholder: string;
  rows?: number;
  maxLength?: number;
  error?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  maxlength?: number;
  className?: string;
  helperText?: string;
  required?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
  showCharCount?: boolean;
  icon?: ReactElement;
  name?: string;
  id?: string;
}

export default function Textarea({
  label,
  placeholder = "",
  value = "",
  onChange,
  onBlur,
  rows = 4,
  maxLength,
  disabled = false,
  required = false,
  error,
  helperText,
  className = "",
  resize = "vertical",
  showCharCount = false,
  icon,
  name,
  id,
}: TextareaProps) {
  const baseStyles =
    "w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none font-normal text-black";

  const normalStyles =
    "border-gray-300 focus:border-indigo-600 hover:border-gray-400";

  const errorStyles = error
    ? "border-red-500 focus:border-red-500 bg-red-50"
    : "";

  const disabledStyles = disabled
    ? "bg-gray-100 cursor-not-allowed opacity-60"
    : "bg-white";

  const resizeStyles = {
    none: "resize-none",
    vertical: "resize-y",
    horizontal: "resize-x",
    both: "resize",
  };

  const currentLength = value?.length || 0;
  const showCounter = showCharCount && maxLength;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label */}
      {label && (
        <label
          htmlFor={id || name}
          className="text-sm font-medium text-black flex items-center gap-1"
        >
          {icon && <span className="text-indigo-600">{icon}</span>}
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Textarea */}
      <textarea
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        className={`
          ${baseStyles}
          ${error ? errorStyles : normalStyles}
          ${disabledStyles}
          ${resizeStyles[resize]}
          ${className}
        `}
      />
      {/* Footer: Helper text, Error, or Character count */}
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        <div className="flex-1">
          {error && (
            <span className="text-red-500 text-sm font-medium">{error}</span>
          )}
          {!error && helperText && (
            <span className="text-gray-500 text-sm">{helperText}</span>
          )}
        </div>

        {showCounter && (
          <span
            className={`text-xs font-medium ${
              currentLength >= maxLength! ? "text-red-500" : "text-gray-400"
            }`}
          >
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}


// Usage Example

// // Basic textarea
// <Textarea
//   label="Description"
//   placeholder="Enter your description..."
//   value={description}
//   onChange={(e) => setDescription(e.target.value)}
// />

// // With character counter
// <Textarea
//   label="Course Description"
//   placeholder="Describe your course..."
//   value={description}
//   onChange={(e) => setDescription(e.target.value)}
//   rows={6}
//   maxLength={500}
//   showCharCount={true}
//   helperText="Provide a detailed description of the course"
// />

// // With error
// <Textarea
//   label="Notes"
//   placeholder="Add your notes..."
//   value={notes}
//   onChange={(e) => setNotes(e.target.value)}
//   error="This field is required"
//   required
// />

// // With icon (from react-icons)
// import { FiFileText } from "react-icons/fi";

// <Textarea
//   label="Assignment"
//   icon={<FiFileText />}
//   placeholder="Write your assignment..."
//   value={assignment}
//   onChange={(e) => setAssignment(e.target.value)}
//   rows={8}
//   resize="none"
// />

// // Disabled
// <Textarea
//   label="Read-only Content"
//   value={content}
//   disabled={true}
//   rows={5}
// />