// app/privacy/page.tsx
// Keep this in step with the code: what's collected, encrypted and stored where.
import Link from "next/link";
import {
  LegalEmail,
  LegalList,
  LegalPage,
  LegalSection,
  Term,
} from "@/components/legal/LegalPage";
import { SITE_URL, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.privacy;

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 5, 2026">
      <LegalSection number={1} title="Introduction">
        <p>
          UniArchive (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is an
          academic resource platform serving Nigerian university students and
          secondary school exam candidates. This policy explains what
          information we collect, how we use it, and how we protect it.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Information We Collect">
        <LegalList
          items={[
            <>
              <Term>Account info:</Term> your name, email address and username.
              If you register with email, we also store your password, but only
              as a one-way (bcrypt) hash, never the password itself.
            </>,
            <>
              <Term>Profile info you choose to add:</Term> phone number, date of
              birth, bio and profile photo.
            </>,
            <>
              <Term>Academic info:</Term> university, faculty, department,
              level and semester.
            </>,
            <>
              <Term>Activity on UniArchive:</Term> the materials you open,
              your reading progress, highlights and bookmarks, comments,
              reactions, submissions and badges.
            </>,
            <>
              <Term>Uploaded content:</Term> PDF documents you upload and your
              profile photo.
            </>,
            <>
              <Term>Google sign-in:</Term> if you sign in with Google, we
              receive your name, email address, profile photo and a Google
              account identifier. We never receive your Google password or
              access any other data in your Google account.
            </>,
            <>
              <Term>Technical info:</Term> when you sign in, we record your IP
              address and a general device type (such as &ldquo;Mobile
              Device&rdquo; or &ldquo;Chrome Browser&rdquo;) with that session.
              We also use IP addresses briefly to limit repeated requests and
              prevent abuse.
            </>,
            <>
              <Term>Reports:</Term> if you report a UniLibrary material, we
              keep the reason and any note with your account so our team can
              follow up. They are in &ldquo;Download my data&rdquo; and deleted
              with your account.
            </>,
            <>
              <Term>Surveys:</Term> when you answer a survey at{" "}
              <Link href="/surveys" className="text-primary hover:underline">/surveys</Link>{" "}
              (signed in or not), we keep your answers and the details the
              survey asks for, such as your school, level and, only if you give
              them, your name and email (encrypted, used only to follow up on
              your answers). The UniArchive team reads them to decide what to
              improve; they are never shown publicly. A school, faculty or
              department you type that we don&apos;t list is reviewed and added
              to UniArchive for everyone. Answers you gave while signed in are
              in &ldquo;Download my data&rdquo;; if you delete your account,
              they stay in the results without your name, email or account.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection number={3} title="How We Use Your Information">
        <LegalList
          items={[
            "To provide the UniArchive service, including your library, reader and profile.",
            "To personalise your experience, such as resuming where you stopped reading.",
            "To review and verify the materials you contribute.",
            "To send account emails, such as verification codes and password reset links, and to show in-app notifications.",
            "To send you UniArchive announcements (new features, maintenance, important notices) unless you turn them off, and our newsletter (new materials, exam-season tips, calls for contributors) only if you turn it on. Every one of these emails has a link to change your choice, and so does Settings > Notifications.",
            "To keep the platform secure and prevent abuse.",
          ]}
        />
        <p>
          We do <Term>not</Term> sell your data to third parties, and we do{" "}
          <Term>not</Term> share it with advertisers.
        </p>
        <p>
          Some information is public by design. Your public profile (name,
          username, photo, bio, role, institution, faculty, department, level,
          number of verified materials and join date), the materials you
          publish and your comments can be seen by other visitors.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Data Storage and Security">
        <p>We use these service providers to run UniArchive:</p>
        <LegalList
          items={[
            <>
              <Term>MongoDB Atlas</Term> (cloud database): your account,
              profile, activity and session records.
            </>,
            <>
              <Term>Cloudinary:</Term> PDF files up to 10 MB, the page images
              shown in the reader, and profile photos.
            </>,
            <>
              <Term>Backblaze B2:</Term> PDF files larger than 10 MB.
            </>,
            <>
              <Term>Upstash</Term> (Redis): short-lived security data, such as
              request counters used for rate limiting.
            </>,
            <>
              <Term>Vercel:</Term> hosts the website and runs our servers.
            </>,
            <>
              <Term>Google:</Term> Google sign-in.
            </>,
            <>
              <Term>ZeptoMail</Term> (Zoho): sends account emails, such as
              sign-in codes and review results.
            </>,
            <>
              <Term>Brevo:</Term> sends announcements and the newsletter. When
              we send one, Brevo receives the email address, first and last
              name, institution, level and role of each person it goes to,
              and tells us who unsubscribed.
            </>,
          ]}
        />
        <p>How we protect your data:</p>
        <LegalList
          items={[
            "Your email address and phone number are encrypted in our database (AES-256).",
            "Passwords are stored only as bcrypt hashes.",
            "Sign-in session tokens, email verification codes and password reset codes are stored only as hashes, never in readable form.",
            "Books you save for offline reading are stored encrypted in your own browser.",
          ]}
        />
        <p>Sign-in sessions expire and are deleted after 7 days.</p>
      </LegalSection>

      <LegalSection number={5} title="Your Rights">
        <LegalList
          items={[
            "View and update your information on your profile and settings pages.",
            "Choose which announcement and newsletter emails you get, at any time, in Settings > Notifications or from the link in those emails.",
            "Download a copy of everything we hold about you, at any time, in Settings > Privacy (Download my data).",
            <>
              Delete your account in Settings &gt; Account. After you confirm
              with a code we email you, your account is hidden and signed out
              at once and erased 7 days later; signing in before then cancels
              it. Materials you published in the UniLibrary, typed questions
              and notes, and your comments stay for other students without
              your name (&ldquo;a former member&rdquo;); everything else is
              erased. You can also ask us at <LegalEmail />.
            </>,
            "Access your uploaded materials through the platform at any time while your account is active.",
          ]}
        />
      </LegalSection>

      <LegalSection number={6} title="Cookies and Browser Storage">
        <LegalList
          items={[
            "We use httpOnly cookies for sign-in only: a session cookie that lasts up to 7 days, and a short-lived access cookie that is renewed about every 15 minutes. Google sign-in also sets a few temporary cookies that last only for the sign-in itself.",
            "If you answer a survey while signed out, we set an httpOnly cookie with a random key (kept for a year) so you can come back and change your answers on the same device. It identifies nothing else.",
            "We do not use advertising, analytics or tracking cookies.",
            "Your browser also stores some things on your device: your theme preference, which prompts you have dismissed, unsaved drafts and pending uploads, and encrypted copies of books you save for offline reading. Clearing your site data removes them.",
          ]}
        />
      </LegalSection>

      <LegalSection number={7} title="Contact">
        <p>Questions about this policy or your data? Contact us:</p>
        <LegalList
          items={[
            <>
              Email: <LegalEmail />
            </>,
            <>
              Website:{" "}
              <a
                href={SITE_URL}
                className="font-medium text-text-primary underline underline-offset-2"
              >
                {SITE_URL.replace(/^https?:\/\//, "")}
              </a>
            </>,
          ]}
        />
      </LegalSection>
    </LegalPage>
  );
}
