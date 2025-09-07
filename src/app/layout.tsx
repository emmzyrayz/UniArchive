import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Import the metadata
import { baseMetadata } from "@/utils/metadata";

import ClientWrapper from "@/components/clientWrapper";
import ContextWrapper from "@/config/advancedContextWrapper";


import { NavigationWrapper } from "@/context/navigationWrapper";
import { AuthProvider } from "@/context/authContext";
import { UserProvider } from "@/context/userContext";
import { AdminProvider } from "@/context/adminContext";
import RouteProtectionProvider from "@/components/protectedRoute";
import DebugUserContext from "@/utils/DebugUserContext";
import { SchoolProvider } from "@/context/schoolContext";
import { CourseProvider } from "@/context/courseContext";
import { MaterialProvider } from "@/context/materialContext";
import { PublicProvider } from "@/context/publicContext";

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
    {
      path: "./fonts/Sora-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Sora-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Sora-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sora",
});

const metadata: Metadata = baseMetadata;

const contextProviders = [
  AuthProvider,
  UserProvider,
  RouteProtectionProvider,
  AdminProvider,
  SchoolProvider,
  CourseProvider,
  MaterialProvider,
  PublicProvider,
];


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("Layout: Providers initializing...");

  return (
    <html
      lang="en"
      className={`
      ${geistSans.variable} 
      ${geistMono.variable} 
      ${sora.variable} 
      antialiased
    `}
    >
      <head>
        <title>{metadata.title as string}</title>
        <meta name="description" content={metadata.description as string} />
      </head>
      <body className="bg-[whitesmoke] font-sora relative">
      <ContextWrapper providers={contextProviders}>
          <DebugUserContext />
          <ClientWrapper>
            <NavigationWrapper>{children}</NavigationWrapper>
          </ClientWrapper>
        </ContextWrapper>
      </body>
    </html>
  );
}
