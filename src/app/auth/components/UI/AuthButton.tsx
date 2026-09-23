interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "primary" | "secondary";
}

// A note for you: This exact bright blue isn't defined in your custom tokens.
// We are using a temporary local token here to replicate the design.
// Add `--color-primary: #1D9BF0` to your globals.css @theme block later.

export default function AuthButton({
  label,
  variant = "primary",
  className,
  ...props
}: AuthButtonProps) {
  const baseClass =
    "w-full py-3 px-6 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed";

     const primaryClass =
       "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100";

     const secondaryClass =
       "bg-transparent border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700";

  return (
    <button
      className={`${baseClass} ${variant === "primary" ? primaryClass : secondaryClass} ${className || ""}`}
      {...props}
    >
      {label}
    </button>
  );
}
