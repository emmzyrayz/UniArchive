// components/auth/UI/AuthSocial.tsx
"use client";

import { motion } from "motion/react";
import { GoogleIcon } from "./SocialIcons";

interface AuthSocialProps {
  onGoogleClick?: () => void;
}

export default function AuthSocial({ onGoogleClick }: AuthSocialProps) {
  return (
    <div className="p-4">
      <motion.button
        type="button"
        aria-label="Continue with Google"
        onClick={onGoogleClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-700 px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        {/* Brand-colored glow — larger than the button, blurred, hidden until hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 -z-10 rounded-lg opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70"
          style={{
            background: "conic-gradient(from 0deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4)",
          }}
        />
        <GoogleIcon className="h-5 w-5" />
        <span>Continue with Google</span>
      </motion.button>
    </div>
  );
}
