// app/loading.tsx
"use client";

import { motion } from "motion/react";
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

// PURE FUNCTION: Generates a deterministic random number based on a seed.
// This satisfies React 19's purity rules while keeping the random behavior.
const pseudoRandom = (seed: number, min: number, max: number) => {
  const x = Math.sin(seed) * 10000;
  const random = x - Math.floor(x);
  return min + random * (max - min);
};

export default function Loading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-accent-foreground"
    >
      {/* Floating Icons */}
      {floatingIcons.map(({ Icon, class: className }, index) => {
        // Generate pure pseudo-random animation values based on the icon's index
        const x1 = `${pseudoRandom(index + 1, -50, 50)}vw`;
        const x2 = `${pseudoRandom(index + 2, -50, 50)}vw`;
        const x3 = `${pseudoRandom(index + 3, -50, 50)}vw`;

        const y1 = `${pseudoRandom(index + 4, -50, 50)}vh`;
        const y2 = `${pseudoRandom(index + 5, -50, 50)}vh`;
        const y3 = `${pseudoRandom(index + 6, -50, 50)}vh`;

        const c1 = `hsl(${pseudoRandom(index + 7, 0, 360)}, 100%, 70%)`;
        const c2 = `hsl(${pseudoRandom(index + 8, 0, 360)}, 100%, 70%)`;
        const c3 = `hsl(${pseudoRandom(index + 9, 0, 360)}, 100%, 70%)`;

        const duration = pseudoRandom(index + 10, 5, 10);

        return (
          <motion.div
            key={index}
            style={{ willChange: "transform, opacity" }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 1.2, 1.5, 2, 1.5, 1.2, 1, 0],
              x: [x1, x2, x3],
              y: [y1, y2, y3],
              color: [c1, c2, c3],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: index * 0.5,
            }}
            className={`absolute ${className}`}
          >
            <Icon className="h-8 w-8" />
          </motion.div>
        );
      })}

      {/* Main Spinner */}
      <div className="relative h-32 w-32">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent glow shadow-lg"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{
            animation: "glow 3s ease-in-out infinite",
            filter: "drop-shadow(0 0 10px rgba(200, 111, 255, 0.5)) blur(2px)",
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
    </motion.div>
  );
}
