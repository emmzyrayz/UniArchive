import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { baseMetadata } from "@/utils/metadata";
import ClientWrapper from "@/components/clientWrapper";
import { NavigationWrapper } from "@/components/navigationWrapper";
import { UserProvider } from "@/context/userContext";
import { PwaInstallButton } from "@/components/UI/PwaInstallButton";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const sora = localFont({
  src: [
    { path: "./fonts/Sora-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Sora-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Sora-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-sora",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

// Merge baseMetadata with PWA-specific fields
export const metadata: Metadata = {
  ...baseMetadata,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UniArchive",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
        try {
          var t = localStorage.getItem('ua-theme') || 'system';
          var resolved = t === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : t;
          document.documentElement.setAttribute('data-theme', resolved);
        } catch(e) {}
      `,
          }}
        />
      </head>
      {/* No manual <head> needed — Next.js injects metadata automatically */}
      <body className="min-h-full flex flex-col">
        <UserProvider>
          <ClientWrapper>
            <NavigationWrapper>
              <div>
                <PwaInstallButton />
                {children}
              </div>
            </NavigationWrapper>
          </ClientWrapper>
        </UserProvider>
      </body>
    </html>
  );
}
