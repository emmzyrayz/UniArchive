"use client";

import { Footer } from "@/components/footer";
import {Navbar} from "@/components/navbar";
import { ScrollRibbon } from "@/components/scrollribbon";
import {usePathname} from "next/navigation";
// import {usePageMonitor, type PageRule} from "@/hooks/usePageMonitor";

// Define page rules for the entire application
// const pageMonitorConfig = {
//   rules: [
//     // Auth pages
//     {
//       path: '/signin',
//       matchType: 'startsWith' as const,
//       hideComponents: ['.navbar', '.footer', '.scroll-ribbon'],
//       bodyClass: 'auth-page',
//     },
//     {
//       path: '/signup',
//       matchType: 'startsWith' as const,
//       hideComponents: ['.navbar', '.footer', '.scroll-ribbon'],
//       bodyClass: 'auth-page',
//     },
//     {
//       path: '/auth',
//       matchType: 'startsWith' as const,
//       hideComponents: ['.navbar', '.footer', '.scroll-ribbon'],
//       bodyClass: 'auth-page',
//     },
//     {
//       path: '/forgotten-password',
//       matchType: 'startsWith' as const,
//       hideComponents: ['.navbar', '.footer', '.scroll-ribbon'],
//       bodyClass: 'auth-page',
//     },
//     // Add any other pages where you want to hide components
//     {
//       path: '/full-screen',
//       matchType: 'startsWith' as const,
//       hideComponents: ['.navbar', '.footer'],
//     },
//     // Example of using regex to match multiple patterns
//     {
//       path: /^\/preview\/.*\/embed$/,
//       matchType: 'regex' as const,
//       hideComponents: ['.navbar', '.footer', '.scroll-ribbon'],
//       bodyClass: 'embedded-preview',
//     }
//   ],
//   // Components that should be hidden on all matched pages
//   defaultHideComponents: [],
// };

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
    <ScrollRibbon />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
