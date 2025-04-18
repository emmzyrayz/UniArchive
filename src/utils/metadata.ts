import {Metadata} from "next";

// Define a more explicit type for page params
interface PageParams {
  page?: string;
}

// Separate the base metadata configuration
export const baseMetadata: Metadata = {
  // Basic SEO Tags
  title: "Panda Academy - Your Go-To Platform for Learning",
  description:
    "Panda Academy: Discover, Learn, Grow. Explore courses on web development, programming, and more. Start your learning journey today!",

  // Open Graph Tags for Social Media
  openGraph: {
    title: "Panda Academy - Your Go-To Platform for Learning",
    description:
      "Panda Academy: Discover, Learn, Grow. Explore courses on web development, programming, and more. Start your learning journey today!",
    url: "https://pandaacademy.vercel.app/",
    siteName: "Panda Academy",
    images: [
      {
        url: "https://pandaacademy.vercel.app/assets/img/logo/logo.png",
        width: 1200,
        height: 630,
        alt: "Panda Academy - Your Go-To Platform for Learning",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter Card Tags
  twitter: {
    card: "summary_large_image",
    title: "Panda Academy - Your Go-To Platform for Learning",
    description:
      "Panda Academy: Discover, Learn, Grow. Explore courses on web development, programming, and more. Start your learning journey today!",
    images: ["https://pandaacademy.vercel.app/assets/img/logo/logo.png"],
    site: "@pandaacademy",
    creator: "@pandaacademy",
  },

  // Additional SEO Optimization
  keywords: [
    "Panda Academy",
    "Online Learning",
    "Web Development Courses",
    "Programming Courses",
    "HTML",
    "CSS",
    "JavaScript",
    "React",
    "Next.js",
    "Frontend Development",
    "Backend Development",
    "Full-Stack Development",
    "Coding Bootcamp",
    "Learn to Code",
    "Online Education",
    "Tech Skills",
    "Career Development",
  ],

  // Robots Meta Tag for SEO Control
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

  // Alternate Language and Canonical URL
  alternates: {
    canonical: "https://pandaacademy.com",
    languages: {
      "en-US": "https://pandaacademy.com",
    },
  },

  // Verification Tags (Update with your actual verification codes)
  verification: {
    google: "your-google-site-verification-code",
    yandex: "your-yandex-verification-code",
  },
};

// Page-specific metadata generator
export function generateMetadata({ params }: { params: PageParams }): Metadata {
  // Define page-specific metadata with explicit typing
  const pageSpecificMetadata: Record<string, Partial<Metadata>> = {
    courses: {
      title: 'Courses | Panda Academy',
      description:
        'Explore our wide range of courses on web development, programming, and more. Start your learning journey with Panda Academy today!',
      openGraph: {
        title: 'Courses | Panda Academy',
        description:
          'Explore our wide range of courses on web development, programming, and more. Start your learning journey with Panda Academy today!',
      },
      twitter: {
        title: 'Courses | Panda Academy',
        description:
          'Explore our wide range of courses on web development, programming, and more. Start your learning journey with Panda Academy today!',
      },
    },
    about: {
      title: 'About Us | Panda Academy',
      description:
        'Learn more about Panda Academy, our mission, and how we help students achieve their learning and career goals.',
      openGraph: {
        title: 'About Us | Panda Academy',
        description:
          'Learn more about Panda Academy, our mission, and how we help students achieve their learning and career goals.',
      },
      twitter: {
        title: 'About Us | Panda Academy',
        description:
          'Learn more about Panda Academy, our mission, and how we help students achieve their learning and career goals.',
      },
    },
    contact: {
      title: 'Contact Us | Panda Academy',
      description:
        'Get in touch with Panda Academy for inquiries, support, or feedback. We’re here to help you on your learning journey!',
      openGraph: {
        title: 'Contact Us | Panda Academy',
        description:
          'Get in touch with Panda Academy for inquiries, support, or feedback. We’re here to help you on your learning journey!',
      },
      twitter: {
        title: 'Contact Us | Panda Academy',
        description:
          'Get in touch with Panda Academy for inquiries, support, or feedback. We’re here to help you on your learning journey!',
      },
    },
    blog: {
      title: 'Blog | Panda Academy',
      description:
        'Read the latest articles, tutorials, and insights on web development, programming, and tech trends from Panda Academy.',
      openGraph: {
        title: 'Blog | Panda Academy',
        description:
          'Read the latest articles, tutorials, and insights on web development, programming, and tech trends from Panda Academy.',
      },
      twitter: {
        title: 'Blog | Panda Academy',
        description:
          'Read the latest articles, tutorials, and insights on web development, programming, and tech trends from Panda Academy.',
      },
    },
  };

  // Merge base metadata with page-specific metadata
  const pageName = params.page?.toLowerCase();
  const pageMetadata: Metadata =
    pageName && pageSpecificMetadata[pageName]
      ? { ...baseMetadata, ...pageSpecificMetadata[pageName] }
      : baseMetadata;

  return pageMetadata;
}

// Export a default metadata object for root/default pages
export const metadata = baseMetadata;