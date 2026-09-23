// components/landing/LandingPage.tsx

"use client";

import { motion } from "motion/react";
import { Button } from "@/components/UI/Buttons";
import BrandLogo from "@/app/auth/components/UI/BrandLogo";

const features = [
  {
    title: "Upload & organize",
    description:
      "Bring your PDFs together in one place instead of scattered across chats, drives, and downloads folders.",
    badge: "Available now",
  },
  {
    title: "Read right in your browser",
    description:
      "No downloads, no extra apps — open and read your materials instantly, even on low-end devices.",
    badge: "Available now",
  },
  {
    title: "Searchable, even when scanned",
    description: "OCR turns scanned lecture notes into fully searchable text.",
    badge: "Coming soon",
  },
  {
    title: "Study together",
    description:
      "Share your library and read alongside friends with live audio and a shared board.",
    badge: "Coming soon",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl"
        >
          <div className="mb-6 flex justify-center">
            <BrandLogo size={56} className="text-text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary tracking-tight">
            Your study materials,
            <br />
            finally in one place.
          </h1>
          <p className="mt-5 text-lg text-text-secondary">
            UniArchive is a home for your PDFs — upload your notes, past
            questions, and textbooks, then read them right in your browser. No
            clutter, no downloads folder chaos.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button href="/auth?view=signup" size="lg">
              Get Started Free
            </Button>
            <Button href="/about" variant="secondary" size="lg">
              See our roadmap
            </Button>
          </div>
        </motion.div>

        {/* Ambient background accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, var(--color-neutral-300), transparent 60%)",
          }}
        />
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-text-primary mb-10">
            Built for how students actually study
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-border bg-surface-raised p-6 hover:shadow-md transition-shadow"
              >
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium mb-3 ${
                    feature.badge === "Available now"
                      ? "bg-success/10 text-success"
                      : "bg-neutral-200 text-text-secondary"
                  }`}
                >
                  {feature.badge}
                </span>
                <h3 className="text-lg font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer strip */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface-raised p-10">
          <h2 className="text-2xl font-bold text-text-primary">
            Ready to get organized?
          </h2>
          <p className="mt-2 text-text-secondary">
            Free to start. No school email required.
          </p>
          <div className="mt-6">
            <Button href="/auth?view=signup" size="lg">
              Create your library
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
