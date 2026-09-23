// app/help/page.tsx
import { FAQAccordion } from "@/components/help/FAQAccordion";
import { faqCategories } from "@/assets/data/faqContent";
import { Button } from "@/components/UI/Buttons";

export default function HelpPage() {
  return (
    <div className="min-h-screen px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            Help center
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Answers to common questions. Can&apos;t find what you need?
          </p>
        </div>

        <FAQAccordion categories={faqCategories} />

        <div className="mt-12 text-center rounded-xl border border-border bg-surface-raised p-8">
          <h2 className="font-semibold text-text-primary mb-2">
            Still have questions?
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            We&apos;re happy to help with anything not covered here.
          </p>
          <Button href="/contact" variant="secondary">
            Contact us
          </Button>
        </div>
      </div>
    </div>
  );
}
