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
    "w-full py-3 px-6 rounded-md font-semibold transition-colors duration-200";

     const primaryClass =
       "bg-accent text-accent-foreground hover:bg-neutral-800";

     const secondaryClass =
       "bg-surface border border-border text-text-secondary hover:bg-neutral-100";

  return (
    <button
      className={`${baseClass} ${variant === "primary" ? primaryClass : secondaryClass} ${className || ""}`}
      {...props}
    >
      {label}
    </button>
  );
}
