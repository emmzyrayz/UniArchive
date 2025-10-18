import { ReactElement, useCallback, useState } from "react";
import { 
  // Card,
   Button, Input, Alert } from "@/components/UI";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface FooterProps {
  logo?: ReactElement;
  description?: string;
  sections: FooterSection[];
  socialLinks?: Array<{
    name: string;
    icon: ReactElement;
    href: string;
  }>;
  copyright?: string;
  className?: string;
  legalLinks?: Array<{ label: string; href: string }>;
  onNewsletterSubscribe?: (email: string) => Promise<boolean>;
  showNewsletter?: boolean;
}

export default function Footer({
  logo,
  description,
  sections,
  socialLinks,
  copyright = `© ${new Date().getFullYear()} Your Company. All rights reserved.`,
  className = "",
  legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
  onNewsletterSubscribe,
  showNewsletter = true,
}: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscriptionState, setSubscriptionState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleNewsletterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!email || !email.includes("@")) {
        setSubscriptionState("error");
        return;
      }

      setSubscriptionState("loading");

      try {
        if (onNewsletterSubscribe) {
          const success = await onNewsletterSubscribe(email);
          if (success) {
            setSubscriptionState("success");
            setEmail("");
            setTimeout(() => setSubscriptionState("idle"), 3000);
          } else {
            setSubscriptionState("error");
            setTimeout(() => setSubscriptionState("idle"), 3000);
          }
        }
      } catch (err) {
        setSubscriptionState("error");
        setTimeout(() => setSubscriptionState("idle"), 3000);
        console.error("Newsletter subscription error:", err);
      }
    },
    [email, onNewsletterSubscribe]
  );

  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-black text-white ${className}`} role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Section */}
          {(logo || description || socialLinks) && (
            <div className="lg:col-span-2 space-y-4">
              {logo && <div className="w-fit">{logo}</div>}
              {description && (
                <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                  {description}
                </p>
              )}

              {/* Social Links */}
              {socialLinks && socialLinks.length > 0 && (
                <div className="flex gap-4 pt-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-indigo-500 transition-colors duration-200"
                      aria-label={`Follow us on ${social.name}`}
                      title={social.name}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Sections */}
          {sections.map((section) => (
            <nav key={section.title} className="space-y-4">
              <h3 className="text-base font-semibold text-white">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-gray-400 hover:text-indigo-500 text-sm transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Newsletter Section */}
        {showNewsletter && (
          <div className="mb-12 p-6 bg-gray-900 rounded-lg border border-gray-800">
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <h4 className="text-base font-semibold text-white mb-1">
                  Stay Updated
                </h4>
                <p className="text-gray-400 text-sm">
                  Get the latest course updates and learning tips delivered to
                  your inbox
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Input
                  type="email"
                  name="newsletter-email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  disabled={subscriptionState === "loading"}
                />
                <Button
                  type="submit"
                  variant="primary"
                  label={
                    subscriptionState === "loading"
                      ? "Subscribing..."
                      : subscriptionState === "success"
                      ? "Subscribed!"
                      : "Subscribe"
                  }
                  loading={subscriptionState === "loading"}
                  disabled={subscriptionState === "success"}
                  className="whitespace-nowrap"
                />
              </div>
            </form>
            {subscriptionState === "success" && (
              <Alert
                type="success"
                message="Thanks for subscribing! Check your email for confirmation."
                className="mt-3"
              />
            )}
            {subscriptionState === "error" && (
              <Alert
                type="error"
                message="Please enter a valid email address."
                className="mt-3"
              />
            )}
          </div>
        )}

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-xs md:text-sm">{copyright} : {currentYear}</p>

            {/* Legal Links */}
            {legalLinks && legalLinks.length > 0 && (
              <nav className="flex flex-wrap justify-center md:justify-end gap-4 md:gap-6">
                {legalLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-gray-400 hover:text-indigo-500 text-xs md:text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}


// // Usage Examples:
// import Footer from "@/components/Footer";

// // Example 1: Basic Footer
// export function BasicFooter() {
//   const sections = [
//     {
//       title: "Product",
//       links: [
//         { label: "Features", href: "/features" },
//         { label: "Pricing", href: "/pricing" },
//         { label: "Security", href: "/security" },
//         { label: "Blog", href: "/blog" },
//       ],
//     },
//     {
//       title: "Company",
//       links: [
//         { label: "About", href: "/about" },
//         { label: "Careers", href: "/careers" },
//         { label: "Contact", href: "/contact" },
//         { label: "Press", href: "/press" },
//       ],
//     },
//     {
//       title: "Resources",
//       links: [
//         { label: "Documentation", href: "/docs" },
//         { label: "API Reference", href: "/api" },
//         { label: "Community", href: "/community" },
//         { label: "Support", href: "/support" },
//       ],
//     },
//   ];

//   return (
//     <Footer
//       sections={sections}
//       copyright="© 2024 Learning Platform. All rights reserved."
//     />
//   );
// }

// // Example 2: Footer with Logo and Social Links
// export function FooterWithBranding() {
//   const sections = [
//     {
//       title: "Courses",
//       links: [
//         { label: "Web Development", href: "/courses/web" },
//         { label: "Mobile Apps", href: "/courses/mobile" },
//         { label: "Data Science", href: "/courses/data" },
//         { label: "Cloud Computing", href: "/courses/cloud" },
//       ],
//     },
//     {
//       title: "Learn",
//       links: [
//         { label: "Getting Started", href: "/learn/start" },
//         { label: "Best Practices", href: "/learn/practices" },
//         { label: "Tutorials", href: "/learn/tutorials" },
//         { label: "FAQ", href: "/learn/faq" },
//       ],
//     },
//     {
//       title: "Community",
//       links: [
//         { label: "Forums", href: "/forums" },
//         { label: "Discussions", href: "/discussions" },
//         { label: "Events", href: "/events" },
//         { label: "Meetups", href: "/meetups" },
//       ],
//     },
//   ];

//   const socialLinks = [
//     {
//       name: "Twitter",
//       icon: <span className="text-lg">𝕏</span>,
//       href: "https://twitter.com",
//     },
//     {
//       name: "LinkedIn",
//       icon: <span className="text-lg">in</span>,
//       href: "https://linkedin.com",
//     },
//     {
//       name: "GitHub",
//       icon: <span className="text-lg">⚙️</span>,
//       href: "https://github.com",
//     },
//     {
//       name: "Discord",
//       icon: <span className="text-lg">💬</span>,
//       href: "https://discord.com",
//     },
//   ];

//   return (
//     <Footer
//       logo={<div className="text-2xl font-bold text-indigo-500">LearnHub</div>}
//       description="Empower your learning journey with world-class courses and a supportive community."
//       sections={sections}
//       socialLinks={socialLinks}
//       copyright="© 2024 LearnHub. Building the future of education."
//     />
//   );
// }

// // Example 3: Footer with Newsletter Subscription
// export function FooterWithNewsletter() {
//   const handleNewsletterSubscribe = async (email: string): Promise<boolean> => {
//     try {
//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//       console.log("Subscribed:", email);
//       return true;
//     } catch (error) {
//       console.error("Subscription failed:", error);
//       return false;
//     }
//   };

//   const sections = [
//     {
//       title: "Platform",
//       links: [
//         { label: "Home", href: "/" },
//         { label: "Courses", href: "/courses" },
//         { label: "Dashboard", href: "/dashboard" },
//         { label: "Pricing", href: "/pricing" },
//       ],
//     },
//     {
//       title: "Support",
//       links: [
//         { label: "Help Center", href: "/help" },
//         { label: "Contact Us", href: "/contact" },
//         { label: "Status", href: "/status" },
//         { label: "Blog", href: "/blog" },
//       ],
//     },
//     {
//       title: "Legal",
//       links: [
//         { label: "Privacy", href: "/privacy" },
//         { label: "Terms", href: "/terms" },
//         { label: "Cookies", href: "/cookies" },
//         { label: "Compliance", href: "/compliance" },
//       ],
//     },
//   ];

//   return (
//     <Footer
//       logo={<div className="text-xl font-bold text-white">EduPlatform</div>}
//       description="Learn at your own pace from industry experts and advance your career."
//       sections={sections}
//       onNewsletterSubscribe={handleNewsletterSubscribe}
//       showNewsletter={true}
//     />
//   );
// }

// // Example 4: Educational Platform Footer (Complete)
// export function EducationFooter() {
//   const handleNewsletterSubscribe = async (email: string): Promise<boolean> => {
//     try {
//       const response = await fetch("/api/newsletter", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email }),
//       });
//       return response.ok;
//     } catch (error) {
//       console.error("Newsletter error:", error);
//       return false;
//     }
//   };

//   const sections = [
//     {
//       title: "Courses",
//       links: [
//         { label: "All Courses", href: "/courses" },
//         { label: "Beginner", href: "/courses?level=beginner" },
//         { label: "Intermediate", href: "/courses?level=intermediate" },
//         { label: "Advanced", href: "/courses?level=advanced" },
//       ],
//     },
//     {
//       title: "Learning",
//       links: [
//         { label: "Learning Paths", href: "/paths" },
//         { label: "Certifications", href: "/certifications" },
//         { label: "Projects", href: "/projects" },
//         { label: "Challenges", href: "/challenges" },
//       ],
//     },
//     {
//       title: "Company",
//       links: [
//         { label: "About Us", href: "/about" },
//         { label: "Careers", href: "/careers" },
//         { label: "Blog", href: "/blog" },
//         { label: "Contact", href: "/contact" },
//       ],
//     },
//     {
//       title: "Support",
//       links: [
//         { label: "Help Center", href: "/help" },
//         { label: "Contact Support", href: "/support" },
//         { label: "Report Issue", href: "/report" },
//         { label: "Feedback", href: "/feedback" },
//       ],
//     },
//   ];

//   const socialLinks = [
//     {
//       name: "Twitter",
//       icon: <span className="text-xl">𝕏</span>,
//       href: "https://twitter.com/ourplatform",
//     },
//     {
//       name: "LinkedIn",
//       icon: <span className="text-xl">💼</span>,
//       href: "https://linkedin.com/company/ourplatform",
//     },
//     {
//       name: "GitHub",
//       icon: <span className="text-xl">💻</span>,
//       href: "https://github.com/ourplatform",
//     },
//     {
//       name: "YouTube",
//       icon: <span className="text-xl">▶️</span>,
//       href: "https://youtube.com/@ourplatform",
//     },
//   ];

//   const legalLinks = [
//     { label: "Privacy Policy", href: "/privacy" },
//     { label: "Terms of Service", href: "/terms" },
//     { label: "Cookie Policy", href: "/cookies" },
//     { label: "Accessibility", href: "/accessibility" },
//   ];

//   return (
//     <Footer
//       logo={
//         <div className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent">
//           EduHub
//         </div>
//       }
//       description="Transforming education through technology. Learn from industry experts and connect with millions of learners worldwide."
//       sections={sections}
//       socialLinks={socialLinks}
//       legalLinks={legalLinks}
//       onNewsletterSubscribe={handleNewsletterSubscribe}
//       showNewsletter={true}
//       copyright="© 2024 EduHub. All rights reserved. | Empowering learners globally."
//     />
//   );
// }

// // Example 5: Minimal Footer
// export function MinimalFooter() {
//   const sections = [
//     {
//       title: "Quick Links",
//       links: [
//         { label: "Home", href: "/" },
//         { label: "Courses", href: "/courses" },
//         { label: "About", href: "/about" },
//         { label: "Contact", href: "/contact" },
//         { label: "Privacy", href: "/privacy" },
//         { label: "Terms", href: "/terms" },
//       ],
//     },
//   ];

//   return (
//     <Footer
//       sections={sections}
//       showNewsletter={false}
//       copyright="© 2024 Learning Platform."
//     />
//   );
// }

// // Example 6: Complete Page Layout with Footer
// export default function PageWithFooter() {
//   const handleNewsletterSubscribe = async (email: string): Promise<boolean> => {
//     try {
//       // Simulate API call to subscribe user
//       await new Promise((resolve) => setTimeout(resolve, 1500));
//       console.log("New subscriber:", email);
//       // In real app, send to backend
//       return true;
//     } catch (error) {
//       console.error("Subscription error:", error);
//       return false;
//     }
//   };

//   const footerSections = [
//     {
//       title: "Courses",
//       links: [
//         { label: "Web Development", href: "/courses/web" },
//         { label: "Mobile Development", href: "/courses/mobile" },
//         { label: "Data Science", href: "/courses/data" },
//         { label: "Cloud & DevOps", href: "/courses/devops" },
//         { label: "View All", href: "/courses" },
//       ],
//     },
//     {
//       title: "Resources",
//       links: [
//         { label: "Learning Paths", href: "/paths" },
//         { label: "Projects", href: "/projects" },
//         { label: "Certifications", href: "/certifications" },
//         { label: "Blog", href: "/blog" },
//         { label: "Documentation", href: "/docs" },
//       ],
//     },
//     {
//       title: "Community",
//       links: [
//         { label: "Forums", href: "/forums" },
//         { label: "Discussions", href: "/discussions" },
//         { label: "Events", href: "/events" },
//         { label: "Meetups", href: "/meetups" },
//         { label: "Contributors", href: "/contributors" },
//       ],
//     },
//     {
//       title: "Company",
//       links: [
//         { label: "About", href: "/about" },
//         { label: "Careers", href: "/careers" },
//         { label: "Press Kit", href: "/press" },
//         { label: "Contact", href: "/contact" },
//         { label: "Investors", href: "/investors" },
//       ],
//     },
//   ];

//   const socialLinks = [
//     {
//       name: "Twitter",
//       icon: <span className="text-lg font-bold">𝕏</span>,
//       href: "https://twitter.com/platform",
//     },
//     {
//       name: "LinkedIn",
//       icon: <span className="text-lg">in</span>,
//       href: "https://linkedin.com/company/platform",
//     },
//     {
//       name: "GitHub",
//       icon: <span className="text-lg">⚙️</span>,
//       href: "https://github.com/platform",
//     },
//     {
//       name: "Discord",
//       icon: <span className="text-lg">💬</span>,
//       href: "https://discord.gg/platform",
//     },
//   ];

//   return (
//     <div className="min-h-screen flex flex-col">
//       {/* Main Content */}
//       <main className="flex-1 bg-gray-50">
//         <div className="max-w-7xl mx-auto px-4 py-12">
//           <h1 className="text-4xl font-bold text-black mb-4">
//             Welcome to LearnHub
//           </h1>
//           <p className="text-gray-600 mb-8">
//             Discover thousands of courses and start learning today.
//           </p>
//           {/* Page content goes here */}
//         </div>
//       </main>

//       {/* Footer */}
//       <Footer
//         logo={
//           <div className="text-2xl font-bold text-indigo-400">LearnHub</div>
//         }
//         description="Join millions of students learning together. Access world-class education and advance your career with our comprehensive learning platform."
//         sections={footerSections}
//         socialLinks={socialLinks}
//         legalLinks={[
//           { label: "Privacy Policy", href: "/privacy" },
//           { label: "Terms of Service", href: "/terms" },
//           { label: "Cookie Policy", href: "/cookies" },
//           { label: "Accessibility Statement", href: "/accessibility" },
//         ]}
//         onNewsletterSubscribe={handleNewsletterSubscribe}
//         showNewsletter={true}
//         copyright="© 2024 LearnHub. All rights reserved. Empowering learners worldwide."
//       />
//     </div>
//   );
// }