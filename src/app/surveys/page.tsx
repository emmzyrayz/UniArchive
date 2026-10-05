// app/surveys/page.tsx
// Surveys taking answers right now. Public; not indexed.
import Link from "next/link";
import { createMetadata } from "@/lib/seo";
import { listOpenSurveys } from "@/lib/survey/public";

export const metadata = createMetadata({
  title: "Surveys",
  description: "Tell us what you think of UniArchive and what you need from it.",
  path: "/surveys",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });

export default async function SurveysPage() {
  const surveys = await listOpenSurveys();
  return (
    <main className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Surveys</h1>
        <p className="mt-2 text-text-secondary">
          Tell us what you think and what you need. Every answer is read by the team, and it shapes what we build next.
        </p>
        {surveys.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
            No surveys are open right now. Check back soon.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {surveys.map((s) => (
              <li key={String(s._id)}>
                <Link
                  href={`/surveys/${s.slug}`}
                  className="block rounded-2xl border border-border bg-surface-raised p-5 transition-shadow hover:shadow-md"
                >
                  <p className="font-semibold text-text-primary">{s.title}</p>
                  {s.intro && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{s.intro}</p>}
                  <p className="mt-2 text-xs text-text-muted">
                    {s.questions.length} question{s.questions.length === 1 ? "" : "s"}
                    {s.closesAt && ` · open until ${dateFormat.format(new Date(s.closesAt))}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
