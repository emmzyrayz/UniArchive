import { ChangeEvent, KeyboardEvent, ReactElement } from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void;
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
}

export default function Input({
  label,
  placeholder = "",
  name,
  type = "text",
  value,
  onChange,
  onBlur,
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
}: InputProps) {

  const baseStyles =
    "w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none font-normal text-black";

  const normalStyles =
    "border-gray-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 hover:border-gray-400";

  const errorStyles = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50"
    : "";

  const disabledStyles = disabled
    ? "bg-gray-100 cursor-not-allowed opacity-60"
    : "bg-white";

  const iconPaddingStyles = icon
    ? iconPosition === "left"
      ? "pl-11"
      : "pr-11"
    : "";

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

      {/* Input Container */}
      <div className="relative w-full">
        {/* Icon - Left */}
        {icon && iconPosition === "left" && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
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
            ${iconPaddingStyles}
            ${className}
          `}
        />

        {/* Icon - Right */}
        {icon && iconPosition === "right" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
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