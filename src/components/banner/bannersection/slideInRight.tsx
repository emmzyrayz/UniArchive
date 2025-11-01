"use client";

import { motion } from "framer-motion";
import { BannerSectionProps } from "../types";

export default function SlideInRight({
  children,
  duration = 0.7,
  delay = 0,
  className = "",
}: BannerSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      whileInView={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration, delay, type: "spring", stiffness: 80 }}
      className={className}
      viewport={{ once: true, amount: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
