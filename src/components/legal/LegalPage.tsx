// components/legal/LegalPage.tsx
// Shared layout for /privacy and /terms: a readable single column with
// numbered sections.
import type { ReactNode } from "react";

export const LEGAL_CONTACT_EMAIL = "emmanueldike275@gmail.com";
export const LEGAL_LAST_UPDATED = "September 29, 2026";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-16 sm:px-6 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <header className="mb-10 border-b border-border pb-8">
          <h1 className="text-3xl font-extrabold text-text-primary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Last updated: {LEGAL_LAST_UPDATED}
          </p>
          {intro && (
            <div className="mt-6 text-base leading-7 text-text-secondary">{intro}</div>
          )}
        </header>
        <div className="space-y-10">{children}</div>
      </article>
    </div>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`section-${number}`} className="scroll-mt-24">
      <h2
        id={`section-${number}`}
        className="mb-4 text-xl font-bold text-text-primary"
      >
        {number}. {title}
      </h2>
      <div className="space-y-4 text-base leading-7 text-text-secondary">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6 marker:text-text-muted">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalEmail() {
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className="font-medium text-text-primary underline underline-offset-2 break-all"
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}

/** Emphasis for a term inside a list item, e.g. "Account info:". */
export function Term({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-text-primary">{children}</strong>;
}
