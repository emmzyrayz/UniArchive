// data/faqContent.ts
import type { FAQCategory } from "@/components/help/FAQAccordion";

export const faqCategories: FAQCategory[] = [
  {
    title: "Getting started",
    items: [
      {
        question: "What is UniArchive?",
        answer:
          "UniArchive is a place to upload, organize, and read your study PDFs directly in your browser — no more hunting through downloads folders or group chats for that one document.",
      },
      {
        question: "Do I need a school email to sign up?",
        answer:
          "No. A personal email is enough to create an account. If your institution issues a school email, you can add and verify it later from your profile, but it's completely optional.",
      },
      {
        question: "Is UniArchive free?",
        answer:
          "Yes, UniArchive is free to use. There are no hidden fees for uploading or reading your own materials.",
      },
    ],
  },
  {
    title: "Uploading & your library",
    items: [
      {
        question: "What file types can I upload?",
        answer:
          "Right now, UniArchive supports PDF files. Support for images and other formats is planned for a future update.",
      },
      {
        question: "Is there a file size limit?",
        answer:
          "We're finalizing upload limits as we roll out storage. This section will be updated with exact limits before launch.",
      },
      {
        question: "Can other people see the materials I upload?",
        answer:
          "No — your uploads are private to your account by default. Shared libraries, where you can choose to share materials with specific friends, are planned for a future update.",
      },
    ],
  },
  {
    title: "Reading & features",
    items: [
      {
        question: "Can I read scanned PDFs, or only typed documents?",
        answer:
          "You can upload and read both today. Full-text search inside scanned PDFs (via OCR) is coming in a future update — for now, search works on file titles and tags.",
      },
      {
        question: "Does UniArchive work offline?",
        answer:
          "Offline access for previously opened materials is on our roadmap. Check the Roadmap section on our About page for current progress.",
      },
      {
        question: "Can I highlight or take notes on my PDFs?",
        answer:
          "Not yet — annotations and highlights are a planned feature. You can track its progress on our About page.",
      },
    ],
  },
  {
    title: "Account & privacy",
    items: [
      {
        question: "How is my personal information protected?",
        answer:
          "Sensitive details like your email and phone number are encrypted before being stored. We never share your personal information with third parties.",
      },
      {
        question: "How do I reset my password?",
        answer:
          'From the sign-in page, select "Forgot Password?" and follow the instructions sent to your email.',
      },
      {
        question: "How do I delete my account?",
        answer:
          "Account deletion isn't self-serve yet — reach out to us through the Contact page and we'll take care of it for you.",
      },
    ],
  },
];
