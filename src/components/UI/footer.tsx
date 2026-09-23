// components/UI/footer.tsx
import Link from "next/link";
import BrandLogo from "@/app/auth/components/UI/BrandLogo";

const CONTACT_EMAIL = "uniarchive.team@gmail.com";

interface FooterLink {
  label: string;
  href: string;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Help", href: "/help" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Study",
    links: [
      { label: "Materials", href: "/materials" },
      { label: "Upload", href: "/upload" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Read", href: "/home" },
    ],
  },
];

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
};

const SOCIALS = [
  {
    label: "UniArchive on X (Twitter)",
    href: "#",
    icon: (
      <svg {...iconProps}>
        <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.2h1.7L7.4 4.72H5.58l11.09 14.48z" />
      </svg>
    ),
  },
  {
    label: "UniArchive on GitHub",
    href: "#",
    icon: (
      <svg {...iconProps}>
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.55v-1.97c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.16.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.8.55A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
      </svg>
    ),
  },
  {
    label: "UniArchive on Instagram",
    href: "#",
    icon: (
      <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const linkClass =
  "text-sm text-white/60 hover:text-white transition-colors duration-200";

export const Footer = () => {
  return (
    <footer className="mt-16 w-full bg-neutral-900 text-white">
      <div className="mx-auto max-w-6xl px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <BrandLogo size={36} className="text-white" />
              <span className="text-lg font-bold tracking-tight">UniArchive</span>
            </Link>
            <p className="max-w-xs text-sm text-white/60">
              Your study materials, organised and readable anywhere — built for
              university students.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors duration-200 hover:bg-white/20 hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/90">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Legal */}
          <nav aria-label="Legal">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/90">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className={linkClass}>
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  Privacy
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className={`${linkClass} inline-flex items-center gap-2 break-all`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="shrink-0"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/50 sm:text-left">
          © {new Date().getFullYear()} UniArchive. Built for Nigerian students.
        </div>
      </div>
    </footer>
  );
};
