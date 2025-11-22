import { ChangeEvent, KeyboardEvent, ReactElement } from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search" | "date";
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  maxLength?: number;
  minLength?: number;
  className?: string;
  icon?: ReactElement;
  iconPosition?: "left" | "right";
  id?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  showCancelButton?: boolean;
  onCancel?: () => void;
}

export default function Input({
  label,
  placeholder = "",
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyPress,
  disabled = false,
  required = false,
  error,
  helperText,
  maxLength,
  minLength,
  className = "",
  icon,
  iconPosition = "left",
  id,
  autoComplete,
  autoFocus = false,
  showCancelButton = false,
  onCancel,
}: InputProps) {
  const baseStyles =
    "w-full px-4 py-3 h-full rounded-lg border-2 transition-all duration-200 focus:outline-none font-normal text-black";

  const normalStyles =
    "border-gray-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 hover:border-gray-400";

  const errorStyles = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50"
    : "";

  const disabledStyles = disabled
    ? "bg-gray-100 cursor-not-allowed opacity-60"
    : "bg-white";

  // Adjusted padding for icons and cancel button
  let paddingStyles = "";
  if (icon && showCancelButton) {
    paddingStyles = iconPosition === "left" ? "pl-11 pr-11" : "pl-11 pr-11";
  } else if (icon) {
    paddingStyles = iconPosition === "left" ? "pl-11" : "pr-11";
  } else if (showCancelButton) {
    paddingStyles = "pr-11";
  }

  return (
    <div className="flex flex-col gap-1.5 w-full h-full">
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

      {/* Input Container */}
      <div className="relative w-full">
        {/* Icon - Left */}
        {icon && iconPosition === "left" && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-50">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          id={id || name}
          name={name}
          type={showCancelButton ? "text" : type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyPress={onKeyPress}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={`
            ${baseStyles}
            ${error ? errorStyles : normalStyles}
            ${disabledStyles}
            ${paddingStyles}
            ${className}
            z-30
          `}
        />

        {/* Icon - Right */}
        {icon && iconPosition === "right" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 z-50">
            {icon}
          </div>
        )}

        {/* Cancel Button */}
        {showCancelButton && value && (
          <button
            onClick={onCancel}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Clear input"
            type="button"
            tabIndex={-1}
          >
            <svg
              className="w-4 h-4 text-gray-400 hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Footer: Helper text or Error */}
      {error && (
        <span className="text-red-500 text-sm font-medium min-h-[20px]">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-gray-500 text-sm min-h-[20px]">{helperText}</span>
      )}
    </div>
  );
}


// Usage Example 

// import { FiMail, FiLock, FiSearch } from "react-icons/fi";

// Basic input
{/* <Input
  label="Email"
  name="email"
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With icon
<Input
  label="Email"
  name="email"
  type="email"
  icon={<FiMail />}
  placeholder="your@email.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// Password with right icon
<Input
  label="Password"
  name="password"
  type="password"
  icon={<FiLock />}
  iconPosition="right"
  required
  error={passwordError}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

// With helper text
<Input
  label="Username"
  name="username"
  helperText="Choose a unique username (3-20 characters)"
  minLength={3}
  maxLength={20}
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>

// Search input
<Input
  name="search"
  type="search"
  icon={<FiSearch />}
  placeholder="Search courses..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/> */}