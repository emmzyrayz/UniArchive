// components/ui/Button.tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  type?: "button" | "submit";
}

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-colors";
  const sizes = { md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const variants = {
    primary: "bg-accent text-accent-foreground hover:bg-neutral-800",
    secondary:
      "bg-surface border border-border text-text-primary hover:bg-neutral-100",
    ghost: "text-text-secondary hover:text-text-primary",
  };

  const className = `${base} ${sizes[size]} ${variants[variant]}`;

  const content = (
    <motion.span
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.span>
  );

 if (href) {
   return <Link href={href}>{content}</Link>;
 }
 return (
   <button type={type} onClick={onClick}>
     {content}
   </button>
 );
}
