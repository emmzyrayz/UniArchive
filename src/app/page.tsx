"use client";
import {useEffect, useState} from "react";
import Image from "next/image";
import { ShortMenu } from '@/components/menu-tab/page';
import { HmNavbar } from '@/components/navbar/page';
import { redirect } from 'next/navigation';
import {Footer} from "@/components/footer/page";

// Create a custom hook for scroll behavior
const useScrollBehavior = (delay = 3000) => {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when scrolling up, hide when scrolling down
      if (currentScrollY > lastScrollY) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      setLastScrollY(currentScrollY);

      // Reset the timeout
      clearTimeout(timeoutId);

      // Auto-hide after delay if we're not at the top of the page
      if (currentScrollY > 0) {
        timeoutId = setTimeout(() => {
          setVisible(false);
        }, delay);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [lastScrollY, delay]);

  return visible;
};


export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const isVisible = useScrollBehavior(3000);

  // Handle navbar state changes
  const handleNavbarToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
  };

  // redirect("/landing-page");

  return (
     <div className="flex flex-col items-center ">
      <div className="flex flex-row items-start min-h-screen">
        <div
        className={`transition-all duration-300 ease-in-out top-0 left-0 h-screen z-50 fixed
          ${isVisible ? "translate-x-0" : "-translate-x-full hidden"}`}
      >
        <HmNavbar
          className="h-[99vh]"
          onExpandChange={handleNavbarToggle}
          forceCollapse={!isVisible}
        />
      </div>

      <main
        className={`flex-1 transition-all duration-100 ease-in-out py-3
         `}
      >
        {/* Banner takes full width of the content area */}
        <section className="w-full">
          <ShortMenu />
        </section>
      </main>
      </div>

      <div className="footer">
        <Footer />
      </div>
    </div>
  );
}
