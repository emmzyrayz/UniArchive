// /components/LayoutManager.tsx
"use client";

import { useLayoutConfig } from "@/hooks/layoutConfig";
import Navbar from "@/components/navbar";
import {InfoRibbon} from "@/components/UI";
import {Footer} from "@/components/reuse";
import {
  ribbonData,
  footerSections,
  socialLinks,
} from "@/assets/data/layoutData";

interface LayoutManagerProps {
  children: React.ReactNode;
}

export default function LayoutManager({ children }: LayoutManagerProps) {
  const { showNavbar, showInfoRibbon, showFooter } = useLayoutConfig();

  return (
    <>
      {showInfoRibbon && (
        <div className="ribbon flex w-full rounded-md overflow-hidden">
          <InfoRibbon items={ribbonData} />
        </div>
      )}
      {showNavbar && (
        <div className="navbar-sect w-full  flex">
          <Navbar />
        </div>
      )}

      <main className="min-h-screen">{children}</main>

      {showFooter && (
        <div className="footer flex flex-col w-full h-full items-center justify-center rounded-md px-3">
          <Footer
            logo={
              <div className="text-2xl font-bold text-indigo-500">
                UniArchive
              </div>
            }
            description="Empower your learning journey with world-class courses and a supportive community."
            sections={footerSections}
            socialLinks={socialLinks}
            copyright="© 2024 LearnHub. Building the future of education."
          />
        </div>
      )}
    </>
  );
}
