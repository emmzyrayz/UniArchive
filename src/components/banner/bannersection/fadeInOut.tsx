"use client";

import { motion } from "framer-motion";
import { BannerSectionProps } from "../types";

export default function FadeInOut({
  children,
  duration = 0.6,
  delay = 0,
  className = "",
}: BannerSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
      viewport={{ once: true, amount: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
