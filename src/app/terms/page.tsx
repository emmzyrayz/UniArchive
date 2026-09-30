// app/terms/page.tsx
import Link from "next/link";
import {
  LegalEmail,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.terms;

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <LegalSection number={1} title="Acceptance">
        <p>
          By using UniArchive, you agree to these terms. If you disagree, do
          not use the platform. Our{" "}
          <Link
            href="/privacy"
            className="font-medium text-text-primary underline underline-offset-2"
          >
            Privacy Policy
          </Link>{" "}
          explains how we handle your data.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Who Can Use UniArchive">
        <LegalList
          items={[
            "You must be at least 13 years old.",
            "You must provide accurate information when registering.",
            "You may have only one account.",
          ]}
        />
      </LegalSection>

      <LegalSection number={3} title="Acceptable Use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "Upload content you don't own or don't have the right to share.",
            "Upload harmful, offensive or illegal content.",
            "Attempt to hack, scrape or disrupt the platform.",
            "Create fake accounts or impersonate others.",
            "Use the platform for commercial spam.",
          ]}
        />
      </LegalSection>

      <LegalSection number={4} title="Content You Upload">
        <LegalList
          items={[
            "You keep ownership of the content you upload.",
            "By uploading, you give UniArchive a licence to store, display and distribute that content on the platform.",
            "We may remove content that breaks these terms.",
          ]}
        />
      </LegalSection>

      <LegalSection number={5} title="Verified Content">
        <LegalList
          items={[
            "Materials in the UniLibrary are contributed by users.",
            "Some materials are reviewed and marked as verified by our reviewers. Even so, UniArchive does not guarantee that any material is academically accurate.",
            "Always cross-check with your official course materials.",
          ]}
        />
      </LegalSection>

      <LegalSection number={6} title="Account Termination">
        <LegalList
          items={[
            "We may suspend accounts that break these terms.",
            <>
              You may request account deletion at any time by contacting us at{" "}
              <LegalEmail />. We will process your request within 30 days.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection number={7} title="Disclaimer">
        <p>
          UniArchive is provided &ldquo;as is&rdquo;. We are not responsible for
          the accuracy of user-contributed materials.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Governing Law">
        <p>
          These terms are governed by the laws of the Federal Republic of
          Nigeria.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Contact">
        <p>
          Email: <LegalEmail />
        </p>
      </LegalSection>
    </LegalPage>
  );
}
