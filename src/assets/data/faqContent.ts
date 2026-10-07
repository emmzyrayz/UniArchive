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
          "Each PDF can be up to 500 MB. Files up to 10 MB upload fastest; larger ones go to our long-term storage and may take a moment longer to process.",
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
          "You can upload and read both today. Search covers titles, course codes, descriptions and tables of contents, and past questions people have typed out are searchable on their material's page. Searching inside scanned pages (OCR) is on our roadmap.",
      },
      {
        question: "Does UniArchive work offline?",
        answer:
          "Yes. Install UniArchive from your browser, then use 💾 Save offline in the reader to keep a PDF on your device, encrypted; it then opens without data. Very large files may be too big for phones with little memory, and very old phones can only save smaller PDFs for now. Typing out past questions also keeps working offline and syncs when you're back online.",
      },
      {
        question: "Can I highlight or take notes on my PDFs?",
        answer:
          "Yes. In the reader, turn on highlight mode and drag over a passage to highlight it (click a highlight in highlight mode to remove it), or bookmark the page you're on. They're saved to your account automatically and listed under Bookmarks and Highlights on your Dashboard.",
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
