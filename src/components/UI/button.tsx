import { ReactElement, ReactNode } from "react";

interface ButtonProps {
  type?: "submit" | "reset" | "button" | undefined;
  label: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "none";
  base?: "on" | "off";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  loading?: boolean;
  loadingText?: ReactNode;
  spinnerStyle?: "style1" | "style2";
  icon?: ReactElement;
  iconPosition?: "left" | "right";
}

export default function Button({
  type = "submit",
  label,
  variant = "primary",
  base = "on",
  onClick,
  disabled = false,
  className = "",
  error,
  loading = false,
  loadingText = "Loading...",
  spinnerStyle = "style1",
  icon,
  iconPosition = "left",
}: ButtonProps) {
  const bases = {
    on: "px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2",
    off: "",
  };
  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
    secondary: "bg-gray-100 text-black hover:bg-gray-200 active:bg-gray-300",
    outline:
      "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100",
    none: "",
  };

  const loadingUI = {
    style1: (
      <svg
        className="animate-spin h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ),
    style2: (
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
    ),
  };

  const disabledStyles = "opacity-50 cursor-not-allowed hover:bg-indigo-600";
  const errorStyles = error ? "border-2 border-red-500" : "";

  const isDisabled = disabled || loading;

  return (
    <div className="flex flex-col gap-1">
      <button
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        className={`
         ${bases[base]} 
         ${variants[variant]} 
         ${isDisabled ? disabledStyles : ""} 
         ${errorStyles}
         ${className}
         cursor-pointer 
       `}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            {loadingUI[spinnerStyle]}
            <span>{loadingText}</span>
          </div>
        ) : (
          <>
            {icon && iconPosition === "left" && <span>{icon}</span>}
            <span>{label}</span>
            {icon && iconPosition === "right" && <span>{icon}</span>}
          </>
        )}
      </button>
      {error && (
        <span className="text-red-500 text-sm font-medium px-1">{error}</span>
      )}
    </div>
  );
}

// Usage Example

// // Default spinner (style1)
// <Button 
//   label="Sign In" 
//   loading={isSubmitting}
//   loadingText="Signing In..."
// />

// // Style 2 spinner (border ring)
// <Button 
//   label="Sign In" 
//   loading={isSubmitting}
//   loadingText="Signing In..."
//   spinnerStyle="style2"
// />

// // Outline button with style2 spinner
// <Button 
//   label="Cancel" 
//   variant="outline"
//   loading={isCanceling}
//   loadingText="Canceling..."
//   spinnerStyle="style2"
// />