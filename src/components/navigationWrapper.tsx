"use client";

import { Footer } from "@/components/UI/footer";
import {Navbar} from "@/components/UI/navbar";
import { ScrollRibbon } from "@/components/UI/scrollribbon";
import {usePathname} from "next/navigation";
import { useUser } from "@/context/userContext";


// Helper function to check if path should hide navigation
export const shouldHideNavigation = (path: string): boolean => {
  const hiddenPaths = ['/signup', '/signin', '/auth', '/forgotten-password', '/read'];
  return hiddenPaths.some(hiddenPath => path.startsWith(hiddenPath));
};

export function NavigationWrapper({children}: {children: React.ReactNode}) {
   const pathname = usePathname();
   const { hasActiveSession } = useUser();
   const hideNavigation = shouldHideNavigation(pathname);

  if (hideNavigation) {
    return <>{children}</>;
  }

  return (
    <>
      <ScrollRibbon />
      <Navbar />
      <main className={`${hasActiveSession ? "pb-16" : ""} md:pb-0`}>
        {children}
      </main>
      <Footer />
    </>
  );
}
