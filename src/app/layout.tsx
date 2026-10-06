import localFont from "next/font/local";
import "./globals.css";

import { rootMetadata, rootViewport } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import ClientWrapper from "@/components/clientWrapper";
import { NavigationWrapper } from "@/components/navigationWrapper";
import { UserProvider } from "@/context/userContext";
import { PwaInstallButton } from "@/components/UI/PwaInstallButton";
import ProfileCompletionModal from "@/components/profile/ProfileCompletionModal";
import { BadgeToast } from "@/components/UI/BadgeToast";
import { DevModeBadge } from "@/components/DevModeBadge";

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

// Site-wide metadata and viewport live in src/lib/seo.ts. The manifest,
// icons and OG image come from file conventions in src/app (manifest.ts,
// favicon.ico, icon.png, apple-icon.png, opengraph-image.tsx).
export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
      // The theme script below sets data-theme before React loads (no flash
      // of the wrong theme), so this element's attributes differ on purpose
      suppressHydrationWarning
    >
      <head>
        {/* Polyfills for Chrome forks that lag behind (e.g. Kiwi Browser,
            which reports a newer Chrome UA): Uint8Array.prototype.toHex /
            Uint8Array.fromHex (ES2024) and URL.parse (Chrome < 126). pdf.js
            uses them on the main thread; the worker gets the same ones from
            public/pdf.worker.url-polyfill.mjs. Runs before anything else in
            <head>. Defined non-enumerable, like the built-ins. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
        try {
          if (typeof Uint8Array.prototype.toHex !== 'function') {
            Object.defineProperty(Uint8Array.prototype, 'toHex', {
              value: function () {
                var out = '';
                for (var i = 0; i < this.length; i++) {
                  out += (this[i] < 16 ? '0' : '') + this[i].toString(16);
                }
                return out;
              },
              writable: true, configurable: true, enumerable: false
            });
          }
          if (typeof Uint8Array.fromHex !== 'function') {
            Object.defineProperty(Uint8Array, 'fromHex', {
              value: function (hex) {
                if (typeof hex !== 'string') throw new TypeError('fromHex expects a string');
                if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
                  throw new SyntaxError('Invalid hex string');
                }
                var arr = new Uint8Array(hex.length / 2);
                for (var i = 0; i < hex.length; i += 2) {
                  arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
                }
                return arr;
              },
              writable: true, configurable: true, enumerable: false
            });
          }
        } catch (e) {}
        try {
          if (typeof URL.parse !== 'function') {
            URL.parse = function (url, base) {
              try { return new URL(url, base); } catch (e) { return null; }
            };
          }
        } catch (e) {}
      `,
          }}
        />
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
        <JsonLd />
        <DevModeBadge />
        <UserProvider>
          <ClientWrapper>
            <NavigationWrapper>{children}</NavigationWrapper>
            <PwaInstallButton />
            <ProfileCompletionModal />
            <BadgeToast />
          </ClientWrapper>
        </UserProvider>
      </body>
    </html>
  );
}
