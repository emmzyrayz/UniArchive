import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    // Background-sync handler for the offline upload queue
    importScripts: ["/sw-sync.js"],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/_next/static"),
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/_next/image"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-images",
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // Matches both B2 and Cloudinary PDF URLs. The service worker can't
        // read navigator.deviceMemory, so this stays at 50; getPdfCacheLimit()
        // in deviceCapability.ts gives the RAM-based limit to page code.
        urlPattern: ({ url }) => url.pathname.endsWith(".pdf"),
        handler: "CacheFirst",
        options: {
          cacheName: "pdf-files",
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
          rangeRequests: true,
        },
      },
      {
        urlPattern: ({ url }) =>
          url.origin === "https://fonts.googleapis.com" ||
          url.origin === "https://fonts.gstatic.com",
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: ({ url }) =>
          [
            "/home",
            "/dashboard",
            "/profile",
            "/settings",
            "/about",
            "/help",
            "/contact",
            "/upload",
          ].some((p) => url.pathname.startsWith(p)),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "app-pages",
          expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        // Reader pages are rendered on the server, so without this they'd
        // never load offline. Full navigations only: a failed client-side
        // (RSC) navigation falls back to a full one, which hits this cache.
        // Pages never opened here get the /offline fallback, which reads
        // saved page images from IndexedDB instead.
        urlPattern: ({ request, url }) =>
          request.mode === "navigate" && url.pathname.startsWith("/read/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "reader-pages",
          expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "api-responses",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
  images: {
    // Profile avatars (public Cloudinary uploads)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: `/${process.env.CLOUDINARY_CLOUD_NAME ?? "*"}/image/upload/**`,
      },
    ],
  },
};

// Wrap and export the config
export default withPWA(nextConfig);
