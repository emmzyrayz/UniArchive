"use client";

import { motion } from "framer-motion";
import { BannerSectionProps } from "../types";

export default function ScaleUp({
  children,
  duration = 0.6,
  delay = 0,
  className = "",
}: BannerSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration, delay }}
      className={className}
      viewport={{ once: true, amount: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
