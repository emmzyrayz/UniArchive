// app/contact/page.tsx
import { ContactForm } from "@/components/contact/ContactForm";
import { socialLinks } from "@/assets/data/layoutData";

export default function ContactPage() {
  return (
    <div className="min-h-screen px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            Get in touch
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Questions, bug reports, or ideas for what we should build next — we
            read everything.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <ContactForm />
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-surface-raised p-6">
              <h2 className="font-semibold text-text-primary mb-2">
                Email us directly
              </h2>
              <a
                href="mailto:hello@uniarchive.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                hello@uniarchive.com
              </a>
            </div>

            <div className="rounded-xl border border-border bg-surface-raised p-6">
              <h2 className="font-semibold text-text-primary mb-3">
                Follow along
              </h2>
              <div className="flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.name}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}