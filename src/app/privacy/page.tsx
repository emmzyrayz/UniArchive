// app/privacy/page.tsx
// Keep this in step with the code: what's collected, encrypted and stored where.
import type { Metadata } from "next";
import {
  LegalEmail,
  LegalList,
  LegalPage,
  LegalSection,
  Term,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · UniArchive" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
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
              <Term>Google:</Term> Google sign-in, and Gmail for sending
              account emails.
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
            <>
              Request account deletion by contacting us at <LegalEmail />. We
              will process your request within 30 days.
            </>,
            "Access your uploaded materials through the platform at any time while your account is active.",
          ]}
        />
      </LegalSection>

      <LegalSection number={6} title="Cookies and Browser Storage">
        <LegalList
          items={[
            "We use httpOnly cookies for sign-in only: a session cookie that lasts up to 7 days, and a short-lived access cookie that is renewed about every 15 minutes. Google sign-in also sets a few temporary cookies that last only for the sign-in itself.",
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
                href="https://www.uniarchive.com.ng"
                className="font-medium text-text-primary underline underline-offset-2"
              >
                https://www.uniarchive.com.ng
              </a>
            </>,
          ]}
        />
      </LegalSection>
    </LegalPage>
  );
}
