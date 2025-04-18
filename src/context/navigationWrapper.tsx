// NavigationWrapper component (in the same file or separate)
"use client";

import { Footer } from "@/components/footer/page";
import { LpNavbar } from "@/components/navbar/page";
import {usePathname} from "next/navigation";

// Helper function to check if path should hide navigation
export const shouldHideNavigation = (path: string): boolean => {
  const hiddenPaths = ['/signup', '/signin', '/auth', '/forgotten-password'];
  return hiddenPaths.some(hiddenPath => path.startsWith(hiddenPath));
};

export function NavigationWrapper({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const hideNavigation = shouldHideNavigation(pathname);

  if (hideNavigation) {
    return <>{children}</>;
  }

  return (
    <>
      {/* <LpNavbar /> */}
      <main>{children}</main>
      {/* <Footer /> */}
    </>
  );
}
