// components/auth/UI/AuthSocial.tsx
"use client";

import { motion } from "motion/react";
import { GoogleIcon, GitHubIcon, MicrosoftIcon } from "./SocialIcons";

export type Provider = "google" | "github" | "microsoft";

interface SocialProviderConfig {
  id: Provider;
  label: string;
  icon: React.ReactNode;
  glow: string;
}

const PROVIDERS: SocialProviderConfig[] = [
  {
    id: "google",
    label: "Google",
    icon: <GoogleIcon className="h-5 w-5" />,
    glow: "conic-gradient(from 0deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4)",
  },
  {
    id: "github",
    label: "GitHub",
    icon: <GitHubIcon className="h-5 w-5 text-[#181717] dark:text-white" />,
    glow: "radial-gradient(circle, #6e5494, transparent 70%)",
  },
  {
    id: "microsoft",
    label: "Microsoft",
    icon: <MicrosoftIcon className="h-5 w-5" />,
    glow: "conic-gradient(from 0deg, #F25022, #7FBA00, #00A4EF, #FFB900, #F25022)",
  },
];

interface AuthSocialProps {
  onProviderClick?: (provider: Provider) => void;
}

export default function AuthSocial({ onProviderClick }: AuthSocialProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
      {PROVIDERS.map((provider) => (
        <motion.button
          key={provider.id}
          type="button"
          aria-label={`Continue with ${provider.label}`}
          onClick={() => onProviderClick?.(provider.id)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="group relative flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-700 px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {/* Brand-colored glow — larger than the button, blurred, hidden until hover */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-2 -z-10 rounded-lg opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70"
            style={{ background: provider.glow }}
          />
          {provider.icon}
          <span>{provider.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
