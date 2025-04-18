'use client'



import {useCallback, useEffect, useState} from "react";
import {
  FaTwitter,
  FaFacebookF,
  FaInstagram,
  FaArrowTurnUp,
  FaRegCopyright,
} from "react-icons/fa6";
import {IoMail} from "react-icons/io5";

// images
import Logo from '@/assets/img/logo/logo-black.png'
import Image from "next/image";

export const Footer = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Handle scroll event to show/hide back to top button
  const handleScroll = useCallback(() => {
    const scrollThreshold = 300; // Show button after scrolling 300px
    setShowBackToTop(window.scrollY > scrollThreshold);
  }, []);

  // Add scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

    return (
      <footer className="relative w-full bg-black/20 px-4 md:px-[3%] pt-10 pb-6">
        {/* Back to top button */}
        <button
          onClick={scrollToTop}
          className={`fixed right-6 bottom-8 w-[60px] h-[60px] rounded-full 
          bg-black/40 hover:bg-black text-white/70 hover:text-white 
          flex items-center justify-center text-[20px] border border-black 
          transition-all duration-500 shadow-xl hover:shadow-2xl
          ${showBackToTop ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          aria-label="Back to top"
        >
          <FaArrowTurnUp />
        </button>

        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company info section */}
          <div className="lg:col-span-2">
            <div className="relative h-[60px] w-[200px] mb-4">
              <Image
                src={Logo}
                alt="logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <p className="text-base md:text-lg text-black/70 mb-6">
              The automated process starts as soon as your clothes go into the
              machine.
            </p>
            <div className="flex gap-3">
              {[
                {Icon: FaTwitter, href: "#twitter"},
                {Icon: FaFacebookF, href: "#facebook"},
                {Icon: FaInstagram, href: "#instagram"},
                {Icon: IoMail, href: "#mail"},
              ].map(({Icon, href}, index) => (
                <a
                  key={index}
                  href={href}
                  className="w-[50px] h-[50px] flex items-center justify-center rounded-full 
                  text-white/40 bg-black/40 hover:text-white hover:bg-black 
                  transition-all duration-500 ease-in-out"
                  aria-label={href.replace("#", "")}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Solutions section */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Our Solutions
            </h2>
            <ul className="space-y-2">
              {[
                "Design & Creatives",
                "Telecommunication",
                "Restaurant",
                "Programming",
                "Architecture",
              ].map((item, index) => (
                <li key={index}>
                  <a
                    href="#"
                    className="text-base md:text-lg text-black/70 hover:text-black 
                    transition-all duration-500 ease-in-out"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support section */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4">Support</h2>
            <ul className="space-y-2">
              {[
                "Design & Creatives",
                "Telecommunication",
                "Restaurant",
                "Programming",
                "Architecture",
              ].map((item, index) => (
                <li key={index}>
                  <a
                    href="#"
                    className="text-base md:text-lg text-black/70 hover:text-black 
                    transition-all duration-500 ease-in-out"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright section */}
        <div className="text-center pt-6 border-t border-black/10">
          <p className="flex items-center justify-center gap-2 text-base text-black/70">
            Copyright <FaRegCopyright /> {new Date().getFullYear()} All rights
            reserved
          </p>
        </div>
      </footer>
    );
}