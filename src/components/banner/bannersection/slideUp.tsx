"use client";

import { motion } from "framer-motion";
import { BannerSectionProps } from "../types";

export default function SlideUp({
  children,
  duration = 0.7,
  delay = 0,
  className = "",
}: BannerSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration, delay, type: "spring", stiffness: 100 }}
      className={className}
      viewport={{ once: true, amount: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
