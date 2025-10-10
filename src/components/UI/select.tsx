import { ChangeEvent, ReactElement } from "react";


interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }> | string[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  icon?: ReactElement;
  name?: string;
  id?: string;
}


export default function Select({
    label,
    placeholder = "Select an option",
    value,
    onChange,
    onBlur,
    options,
    disabled = false,
    required = false,
    error,
    helperText,
    className = "",
    icon,
    name,
    id,
}: SelectProps) {
    const baseStyles =
      "w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none font-normal text-black appearance-none cursor-pointer";

    const normalStyles =
      "border-gray-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 hover:border-gray-400";

    const errorStyles = error
      ? "border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50"
      : "";

    const disabledStyles = disabled
      ? "bg-gray-100 cursor-not-allowed opacity-60"
      : "bg-white";

    const iconPaddingStyles = icon ? "pl-11" : "";

    // Normalize options to always be array of objects
    const normalizedOptions = options.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt
    );


    return (
      <div className="flex flex-col gap-1.5 w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={id || name}
            className="text-sm font-medium text-black flex items-center gap-1"
          >
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative w-full">
          {/* Icon - Left */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              {icon}
            </div>
          )}

          {/* Select Field */}
          <select
            id={id || name}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            className={`
            ${baseStyles}
            ${error ? errorStyles : normalStyles}
            ${disabledStyles}
            ${iconPaddingStyles}
            ${className}
          `}
          >
            {/* Placeholder option */}
            <option value="" disabled>
              {placeholder}
            </option>

            {/* Map through options */}
            {normalizedOptions.map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown Arrow Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
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

// Usage Example

// import { FiBook } from "react-icons/fi";

// // Simple string array
// <Select
//   label="Subject"
//   name="subject"
//   placeholder="Choose a subject"
//   options={["Math", "Physics", "Chemistry", "Biology"]}
//   value={subject}
//   onChange={(e) => setSubject(e.target.value)}
// />

// // Object array with value/label
// <Select
//   label="Department"
//   name="department"
//   placeholder="Select department"
//   options={[
//     { value: "cs", label: "Computer Science" },
//     { value: "eng", label: "Engineering" },
//     { value: "math", label: "Mathematics" },
//   ]}
//   value={department}
//   onChange={(e) => setDepartment(e.target.value)}
//   required
// />

// // With icon and error
// <Select
//   label="Course Category"
//   name="category"
//   icon={<FiBook />}
//   options={["Programming", "Design", "Business", "Marketing"]}
//   value={category}
//   onChange={(e) => setCategory(e.target.value)}
//   error="Please select a category"
// />

// // With helper text
// <Select
//   label="Grade Level"
//   name="grade"
//   options={["Grade 1", "Grade 2", "Grade 3"]}
//   helperText="Select the appropriate grade level"
//   value={grade}
//   onChange={(e) => setGrade(e.target.value)}
// />