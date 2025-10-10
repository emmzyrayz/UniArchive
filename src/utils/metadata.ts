import { Metadata } from "next";

interface PageParams {
  page?: string;
}

// Constants for easy updates
const WEB_URL = "https://uniarchive.vercel.app"; // Replace with your actual URL
const IMAGE_URL = `${WEB_URL}/assets/og-banner.png`; // Replace with your actual image path
const DESCRIPTION =
  "UniArchive: Your centralized hub for accessing, sharing, and archiving university past questions, lecture notes, handouts, and academic resources.";

export const baseMetadata: Metadata = {
  title: "UniArchive - Your Academic Resource Hub",
  description: DESCRIPTION,

  openGraph: {
    title: "UniArchive - Your Academic Resource Hub",
    description: DESCRIPTION,
    url: WEB_URL,
    siteName: "UniArchive",
    images: [
      {
        url: IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "UniArchive OpenGraph Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "UniArchive - Your Academic Resource Hub",
    description: DESCRIPTION,
    images: [IMAGE_URL],
    site: "@uniarchive",
    creator: "@uniarchive",
  },

  keywords: [
    "UniArchive",
    "Past Questions",
    "Lecture Notes",
    "Academic Resources",
    "University Materials",
    "Student Resources",
    "Study Hub",
    "UNIZIK",
    "Online Archive",
    "Handouts",
    "Educational Notes",
    "Course Materials",
    "Academic Archive",
    "University Exams",
    "Free PDF Downloads",
    "Student Learning Platform",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: WEB_URL,
    languages: {
      "en-US": WEB_URL,
    },
  },

  verification: {
    google: "your-google-site-verification-code",
    yandex: "your-yandex-verification-code",
  },
};

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const pageSpecificMetadata: Record<string, Partial<Metadata>> = {
    resources: {
      title: "Resources | UniArchive",
      description:
        "Browse a vast archive of university past questions, lecture notes, and academic materials by course or department.",
      openGraph: {
        title: "Resources | UniArchive",
        description:
          "Browse a vast archive of university past questions, lecture notes, and academic materials by course or department.",
      },
      twitter: {
        title: "Resources | UniArchive",
        description:
          "Browse a vast archive of university past questions, lecture notes, and academic materials by course or department.",
      },
    },
    departments: {
      title: "Departments | UniArchive",
      description:
        "Find resources organized by departments and faculties from universities across Nigeria and beyond.",
      openGraph: {
        title: "Departments | UniArchive",
        description:
          "Find resources organized by departments and faculties from universities across Nigeria and beyond.",
      },
      twitter: {
        title: "Departments | UniArchive",
        description:
          "Find resources organized by departments and faculties from universities across Nigeria and beyond.",
      },
    },
    about: {
      title: "About Us | UniArchive",
      description:
        "Learn about UniArchive's mission to make academic resources accessible for students everywhere.",
      openGraph: {
        title: "About Us | UniArchive",
        description:
          "Learn about UniArchive's mission to make academic resources accessible for students everywhere.",
      },
      twitter: {
        title: "About Us | UniArchive",
        description:
          "Learn about UniArchive's mission to make academic resources accessible for students everywhere.",
      },
    },
    faq: {
      title: "FAQs | UniArchive",
      description:
        "Find answers to common questions about using UniArchive and contributing academic materials.",
      openGraph: {
        title: "FAQs | UniArchive",
        description:
          "Find answers to common questions about using UniArchive and contributing academic materials.",
      },
      twitter: {
        title: "FAQs | UniArchive",
        description:
          "Find answers to common questions about using UniArchive and contributing academic materials.",
      },
    },
    auth: {
      title: "Auth | UniArchive",
      description:
        "Join us today to find answers to common questions about using UniArchive and contributing academic materials.",
      openGraph: {
        title: "Auth | UniArchive",
        description:
          "Join us today to find answers to common questions about using UniArchive and contributing academic materials.",
      },
      twitter: {
        title: "Auth | UniArchive",
        description:
          "Join us today to find answers to common questions about using UniArchive and contributing academic materials.",
      },
    },
  };

  const pageName = params.page?.toLowerCase();
  const pageMetadata: Metadata =
    pageName && pageSpecificMetadata[pageName]
      ? { ...baseMetadata, ...pageSpecificMetadata[pageName] }
      : baseMetadata;

  return pageMetadata;
}

export const metadata = baseMetadata;