// app/surveys/[slug]/page.tsx
// A survey anyone can answer, signed in or not. Server-rendered with the
// visitor's earlier answers (by account, or the anonymous key cookie) so
// they can change them. Not indexed: surveys come and go.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createMetadata } from "@/lib/seo";
import { getServerSessionUser } from "@/lib/auth/serverSession";
import { loadOwnResponse, loadPublicSurvey, profilePrefill, toPublicSurvey } from "@/lib/survey/public";
import { SURVEY_KEY_COOKIE, hashSurveyKey } from "@/lib/survey/respond";
import { SurveyForm } from "@/components/survey/SurveyForm";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const survey = await loadPublicSurvey(slug).catch(() => null);
  return createMetadata({
    title: survey ? survey.title : "Survey not found",
    description: survey?.intro || "Tell us what you think of UniArchive.",
    path: `/surveys/${encodeURIComponent(slug)}`,
    noIndex: true,
  });
}

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function SurveyPage({ params }: Props) {
  const { slug } = await params;
  const doc = await loadPublicSurvey(slug);
  if (!doc) notFound();
  const survey = toPublicSurvey(doc);
  const session = await getServerSessionUser();
  const keyHash = session ? undefined : hashSurveyKey((await cookies()).get(SURVEY_KEY_COOKIE)?.value);
  const [own, prefill] = await Promise.all([
    loadOwnResponse(doc._id, session, keyHash),
    session ? profilePrefill(session) : Promise.resolve({}),
  ]);
  const upcoming = survey.status === "open" && survey.opensAt && new Date(survey.opensAt) > new Date();

  return (
    <main className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/surveys" className="text-sm text-text-secondary hover:text-text-primary">
          ← All surveys
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-text-primary sm:text-3xl">{survey.title}</h1>
        {survey.intro && <p className="mt-3 whitespace-pre-line text-text-secondary">{survey.intro}</p>}
        {survey.accepting && survey.closesAt && (
          <p className="mt-2 text-sm text-text-muted">Open until {dateFormat.format(new Date(survey.closesAt))}.</p>
        )}
        <div className="mt-6">
          {survey.accepting ? (
            <SurveyForm survey={survey} own={own} prefill={prefill} signedIn={!!session} />
          ) : (
            <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center">
              <h2 className="text-lg font-semibold text-text-primary">
                {upcoming ? `This survey opens on ${dateFormat.format(new Date(survey.opensAt!))}.` : "This survey is closed."}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {own
                  ? `You answered it on ${dateFormat.format(new Date(own.updatedAt))}. Thank you!`
                  : upcoming
                    ? "Come back then to answer it."
                    : "Thanks to everyone who answered."}
              </p>
              <Link href="/surveys" className="mt-4 inline-block text-sm text-primary hover:underline">
                See open surveys
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
