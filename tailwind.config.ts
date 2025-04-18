import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "320px", // Mobile S
      md: "550px", // Mobile M
      lg: "950px", // Mobile L
      xl: "1200px", // Laptop
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-sora)", "var(--font-geist-sans)"],
        sora: ["var(--font-sora)"],
      },
      keyframes: {
        "shadow-pulse": {
          "0%, 100%": {filter: "drop-shadow(0 0 8px rgba(200, 111, 255, 0.3))"},
          "50%": {filter: "drop-shadow(0 0 15px rgba(200, 111, 255, 0.5))"},
        },
        glow: {
          "0%, 100%": {
            filter: "drop-shadow(0 0 10px rgba(200, 111, 255, 0.5)) blur(2px)",
          },
          "50%": {
            filter: "drop-shadow(0 0 20px rgba(200, 111, 255, 0.8)) blur(4px)",
          },
        },
        wiggle: {
          "0%, 100%": {transform: "rotate(0deg)"},
          "25%": {transform: "rotate(-5deg)"},
          "75%": {transform: "rotate(5deg)"},
        },
      },
      animation: {
        "shadow-pulse": "shadow-pulse 2s ease-in-out infinite",
        glow: "glow 3s ease-in-out infinite",
        wiggle: "wiggle 0.5s ease-in-out",
      },
      utilities: {
        ".scrollbar-hide::-webkit-scrollbar": {
          display: "none",
        },
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
      },
      backdropBlur: {
        lg: "24px",
      },
      transitionProperty: {
        opacity: "opacity",
      },
    },
  },
  plugins: [require("tailwindcss-interaction-variants")],
} satisfies Config;