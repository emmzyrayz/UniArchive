interface InputProps {
  label: string;
  type: string;
  variant?: "primary" | "secondary" | "outline";
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

export default function Input({
  label,
  type = "text",
  variant = "primary",
  value,
  onChange,
  disabled,
  className = "",
}: InputProps) {
  const base =
    "px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm";
  const variants = {
    primary: "bg-blue-600 text-white placeholder-gray-200",
    secondary: "bg-gray-100 text-gray-700 placeholder-gray-500",
    outline: "border border-gray-300 text-gray-700 placeholder-gray-400",
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        type={type}
        value={value}
        placeholder={label}
        onChange={onChange}
        disabled={disabled}
        className={`${base} ${variants[variant]} ${className}`}
      />
    </div>
  );
}
