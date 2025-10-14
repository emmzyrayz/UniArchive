"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import {
  LuAtom,
  LuFlaskConical,
  LuCalculator,
  LuGlobe,
  LuBookOpen,
  LuBrain,
  LuMicroscope,
  LuPencil,
  LuLibrary,
  LuGraduationCap,
  LuPuzzle,
  LuDna,
  LuLightbulb,
  LuClipboardList,
  LuTarget,
  LuBookmark,
  LuBook,
  LuCode,
  LuHeadphones,
  LuMapPin,
  LuTrophy,
  LuLanguages,
  LuLoader,
} from "react-icons/lu";
import { GoAlertFill } from "react-icons/go";
import { FaChartSimple } from "react-icons/fa6";

const floatingIcons = [
  { Icon: LuAtom, class: "top-1/4 left-1/4" },
  { Icon: LuFlaskConical, class: "top-1/3 right-1/4" },
  { Icon: LuCalculator, class: "bottom-1/4 left-1/3" },
  { Icon: LuGlobe, class: "bottom-1/3 right-1/3" },
  { Icon: LuBookOpen, class: "top-1/2 left-1/2" },
  { Icon: LuBrain, class: "top-1/4 right-1/2" },
  { Icon: LuMicroscope, class: "bottom-1/4 right-1/2" },
  { Icon: LuPencil, class: "top-1/3 left-1/4" },
  { Icon: LuLibrary, class: "bottom-1/3 left-1/4" },
  { Icon: LuGraduationCap, class: "top-1/4 left-1/2" },
  { Icon: LuPuzzle, class: "bottom-1/4 right-1/4" },
  { Icon: LuDna, class: "top-1/3 left-1/3" },
  { Icon: GoAlertFill, class: "bottom-1/3 left-1/2" },
  { Icon: LuLightbulb, class: "top-1/2 right-1/4" },
  { Icon: LuClipboardList, class: "bottom-1/2 left-1/4" },
  { Icon: LuTarget, class: "top-1/4 right-1/4" },
  { Icon: LuBookmark, class: "bottom-1/3 right-1/2" },
  { Icon: FaChartSimple, class: "top-1/3 right-1/2" },
  { Icon: LuBook, class: "bottom-1/4 left-1/2" },
  { Icon: LuCode, class: "top-1/2 left-1/4" },
  { Icon: LuHeadphones, class: "bottom-1/2 right-1/4" },
  { Icon: LuMapPin, class: "top-1/3 left-1/2" },
  { Icon: LuTrophy, class: "bottom-1/4 right-1/2" },
  { Icon: LuLanguages, class: "top-1/2 right-1/2" },
];

interface LoadingProps {
  variant?:
    | "spinner"
    | "pulse"
    | "dots"
    | "bars"
    | "educational"
    | "minimal"
    | "pages"
    | "circle";
  size?: "sm" | "md" | "lg" | "xl";
  messageSize?: "sm" | "md" | "lg" | "xl";
  message?: string;
  messageAnimVariant?: "pulseShadow" | "bounce" | "waveFade" | "typing";
  messageColor?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  color?: "indigo" | "blue" | "green" | "red" | "gray";
  className?: string;
  icon?: ReactNode;
}

export default function Loading({
  variant = "spinner",
  size = "md",
  messageSize = "md",
  message = "Loading...",
  messageAnimVariant = "pulseShadow",
  messageColor = "text-indigo-600",
  fullScreen = false,
  overlay = false,
  color = "indigo",
  className = "",
  icon,
}: LoadingProps) {
  // Size mappings
  const sizeMap = {
    sm: { spinner: "h-6 w-6", text: "text-sm", icon: "h-6 w-6" },
    md: { spinner: "h-12 w-12", text: "text-base", icon: "h-12 w-12" },
    lg: { spinner: "h-16 w-16", text: "text-lg", icon: "h-16 w-16" },
    xl: { spinner: "h-24 w-24", text: "text-xl", icon: "h-20 w-20" },
  };

  const messageSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  // Split message into characters for per-letter animations
  const chars = message.split("");

  const getCharacterAnimation = (index: number) => {
    switch (messageAnimVariant) {
      case "bounce":
        return {
          initial: { y: 0 },
          animate: { y: [0, -6, 0] },
          transition: {
            duration: 0.5,
            repeat: Infinity,
            delay: index * 0.05,
            ease: "easeInOut" as const,
          },
        };

      case "waveFade":
        return {
          initial: { opacity: 0, x: -10 },
          animate: { opacity: [0, 1, 0], x: [0, 0, 0] },
          transition: {
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut" as const,
          },
        };

      case "typing":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: {
            duration: 2.2,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut" as const,
          },
        };

      default:
        return {};
    }
  };

  // Color mappings
  const colorMap = {
    indigo: {
      primary: "border-indigo-600",
      secondary: "bg-indigo-600",
      text: "text-indigo-600",
    },
    blue: {
      primary: "border-blue-600",
      secondary: "bg-blue-600",
      text: "text-blue-600",
    },
    green: {
      primary: "border-green-600",
      secondary: "bg-green-600",
      text: "text-green-600",
    },
    red: {
      primary: "border-red-600",
      secondary: "bg-red-600",
      text: "text-red-600",
    },
    gray: {
      primary: "border-gray-600",
      secondary: "bg-gray-600",
      text: "text-gray-600",
    },
  };

  const sizes = sizeMap[size];
  const colors = colorMap[color];

  // Render different loading variants
  const renderLoader = () => {
    switch (variant) {
      case "spinner":
        return (
          <div
            className={`animate-spin rounded-full border-4 ${colors.primary} border-t-transparent ${sizes.spinner}`}
          />
        );

      case "pulse":
        return (
          <div className="flex gap-2 h-2 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`rounded-full ${colors.secondary} ${
                  size === "sm"
                    ? "h-3 w-3"
                    : size === "md"
                    ? "h-4 w-4"
                    : "h-5 w-5"
                }`}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        );

      case "dots":
        return (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`rounded-full ${colors.secondary} ${
                  size === "sm"
                    ? "h-2 w-2"
                    : size === "md"
                    ? "h-3 w-3"
                    : "h-4 w-4"
                }`}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        );

      case "bars":
        return (
          <div className={`flex items-end gap-1 h-10`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className={`${colors.secondary} ${
                  size === "sm" ? "w-1" : size === "md" ? "w-2" : "w-3"
                }`}
                animate={{ height: ["20%", "100%", "20%"] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                style={{
                  height:
                    size === "sm" ? "24px" : size === "md" ? "48px" : "64px",
                }}
              />
            ))}
          </div>
        );

      case "educational":
        return (
          <div className="relative">
            <motion.div
              className={`absolute inset-0 rounded-full border-4 ${colors.primary} border-t-transparent`}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{
                width: sizes.spinner.split(" ")[0],
                height: sizes.spinner.split(" ")[1],
              }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {icon || (
                <LuBookOpen className={`${sizes.icon} ${colors.text}`} />
              )}
            </motion.div>
          </div>
        );

      case "circle":
        return (
          <motion.div
            className={`rounded-full ${colors.secondary} ${sizes.spinner}`}
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        );

      case "minimal":
        return (
          <LuLoader
            className={`${sizes.spinner} ${colors.text} animate-spin`}
          />
        );

      case "pages":
        return (
          <AnimatePresence>
            {/* Floating Icons */}
            {floatingIcons.map(({ Icon, class: className }, index) => (
              <motion.div
                key={index}
                style={{ willChange: "transform, opacity" }} // Add this line
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 1.2, 1.5, 2, 1.5, 1.2, 1, 0],
                  x: [
                    `${Math.random() * 100 - 50}vw`, // Random horizontal movement
                    `${Math.random() * 100 - 50}vw`,
                    `${Math.random() * 100 - 50}vw`,
                  ],
                  y: [
                    `${Math.random() * 100 - 50}vh`, // Random vertical movement
                    `${Math.random() * 100 - 50}vh`,
                    `${Math.random() * 100 - 50}vh`,
                  ],
                  color: [
                    `hsl(${Math.random() * 360}, 100%, 70%)`, // Random colors
                    `hsl(${Math.random() * 360}, 100%, 70%)`,
                    `hsl(${Math.random() * 360}, 100%, 70%)`,
                  ],
                }}
                transition={{
                  duration: 5 + Math.random() * 5, // Random duration
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                  delay: index * 0.5,
                }}
                className={`absolute ${className}`}
              >
                <Icon className="h-8 w-8" />
              </motion.div>
            ))}

            {/* Main Spinner */}
            <div className="relative h-32 w-32">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent glow shadow-lg"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                style={{
                  animation: "glow 3s ease-in-out infinite",
                  filter:
                    "drop-shadow(0 0 10px rgba(200, 111, 255, 0.5)) blur(2px)",
                }}
              />

              {/* Book Icon with Glow */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  scale: [1, 1.1, 1],
                  filter: [
                    "drop-shadow(0 0 8px rgba(200, 111, 255, 0.3))",
                    "drop-shadow(0 0 15px rgba(200, 111, 255, 0.5))",
                    "drop-shadow(0 0 8px rgba(200, 111, 255, 0.3))",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <LuBookOpen className="h-12 w-12 text-primary" />
              </motion.div>
            </div>
          </AnimatePresence>
        );

      default:
        return null;
    }
  };

  // Container based on fullScreen and overlay props
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center"
    : "flex flex-col items-center justify-center";

  const backgroundClasses = overlay
    ? "bg-white/80 backdrop-blur-sm"
    : fullScreen
    ? "bg-white"
    : "";

    const messageElement = (() => {
      switch (messageAnimVariant) {
        case "pulseShadow":
          return (
            <motion.div
              animate={{
                textShadow: ["0px 0px 0px", "0px 0px 10px", "0px 0px 0px"],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut" as const,
              }}
              className={`${messageSizes[messageSize]} ${messageColor} font-medium text-center`}
            >
              {message}
            </motion.div>
          );

        case "bounce":
        case "waveFade":
        case "typing":
          return (
            <p
              className={`${messageSizes[messageSize]} ${messageColor} font-medium text-center`}
            >
              {chars.map((char, i) => (
                <motion.span key={i} {...getCharacterAnimation(i)}>
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </p>
          );

        default:
          return (
            <span className={`${messageSizes[messageSize]} ${messageColor}`}>
              {message}
            </span>
          );
      }
    })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`${containerClasses} ${backgroundClasses} ${className}`}
      >
        <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
          {renderLoader()}
          {messageElement && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${sizes.text} ${colors.text} font-medium text-center`}
            >
              {messageElement}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Preset Loading Components for common use cases
export const PageLoading = (props: Partial<LoadingProps>) => (
  <Loading
    variant="educational"
    size="xl"
    fullScreen
    message="Loading..."
    {...props}
  />
);

export const ComponentLoading = (props: Partial<LoadingProps>) => (
  <Loading variant="spinner" size="md" {...props} />
);

export const ButtonLoading = (props: Partial<LoadingProps>) => (
  <Loading variant="minimal" size="sm" color="gray" {...props} />
);

export const OverlayLoading = (props: Partial<LoadingProps>) => (
  <Loading
    variant="spinner"
    size="lg"
    fullScreen
    overlay
    message="Processing..."
    {...props}
  />
);
