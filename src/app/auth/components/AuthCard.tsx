// components/auth/AuthCard.tsx
// The card frame SignIn uses, for the standalone /auth/* pages.
import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "./UI/BrandLogo";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8 bg-white dark:bg-neutral-800 p-6 sm:p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl">
      <div className="flex justify-between items-start">
        <BrandLogo size={48} />
        <div className="text-right">
          <p className="text-xl font-bold text-text-primary">UniArchive</p>
          <p className="text-sm text-text-secondary">Academic Management</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Shown when the cookie-held request behind a page has expired. */
export function ExpiredRequest({ title, message }: { title: string; message: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-text-primary">{title}</h1>
      <p className="text-sm text-text-secondary">{message}</p>
      <Link
        href="/auth?view=signin"
        className="inline-block font-semibold text-text-primary hover:underline"
      >
        ← Back to sign in
      </Link>
    </div>
  );
}
