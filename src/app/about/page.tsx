// app/about/page.tsx
import { RoadmapTracker } from "@/components/about/RoadmapTracker";
import { Button } from "@/components/UI/Buttons";

export default function AboutPage() {
  return (
    <div className="min-h-screen px-6 py-20">
      <div className="mx-auto max-w-3xl">
        {/* Mission */}
        <section className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            Why we&apos;re building UniArchive
          </h1>
          <p className="mt-5 text-lg text-text-secondary">
            Every student ends up with study materials scattered across chats,
            drives, and downloads folders they can never find again. We&apos;re
            building a single, honest place for that — starting simple, and
            growing based on what students actually need.
          </p>
        </section>

        {/* What exists today vs what's coming */}
        <section className="mb-16 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-xl border border-border bg-surface-raised p-6">
            <h2 className="font-semibold text-text-primary mb-2">
              Where we are today
            </h2>
            <p className="text-sm text-text-secondary">
              A personal PDF library — upload your materials, read them in your
              browser, and keep everything organized in one place.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-raised p-6">
            <h2 className="font-semibold text-text-primary mb-2">
              Where we&apos;re headed
            </h2>
            <p className="text-sm text-text-secondary">
              A full learning platform — searchable scanned notes, shared
              libraries, and live study rooms with friends.
            </p>
          </div>
        </section>

        {/* Roadmap tracker */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
            Our roadmap
          </h2>
          <RoadmapTracker />
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="text-text-secondary mb-4">
            Have a feature you wish existed? We&apos;d love to hear it.
          </p>
          <Button href="/contact" variant="secondary">
            Get in touch
          </Button>
        </section>
      </div>
    </div>
  );
}
