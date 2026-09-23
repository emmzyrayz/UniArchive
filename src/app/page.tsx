// app/page.tsx
"use client";

import { useUser } from "@/context/userContext";
import LandingPage  from "@/components/landing/landingPage";
import HomePage from "@/app/home/page";

export default function RootPage() {
  const { hasActiveSession, isLoading } = useUser();

  if (isLoading) return null; // avoids flash of wrong view

  if (hasActiveSession) return <HomePage />;

  return <LandingPage />;
}
