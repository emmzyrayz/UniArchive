'use client'

import {useState, useEffect, useRef} from "react";
import { usePathname } from "next/navigation";
import Link from 'next/link';
import Image from 'next/image';

import Logo from '@/assets/img/logo/uniarchive.png';

// import icons
import {FaRegUserCircle, FaUserCircle, FaSearch} from "react-icons/fa";
import {FaXmark} from 'react-icons/fa6';
import {IoMenu} from "react-icons/io5";


export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [ribbonHeight, setRibbonHeight] = useState(0);
  const navbarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  let lastScrollY = 0;
  let hideNavbarTimeout: NodeJS.Timeout;

  // Detect ribbon height
  useEffect(() => {
    const updateRibbonHeight = () => {
      const ribbon = document.querySelector(".scroll-ribbon") as HTMLElement;
      if (ribbon) {
        const height = ribbon.offsetHeight;
        setRibbonHeight(height);
      } else {
        setRibbonHeight(0);
      }
    };

    // Initial check
    updateRibbonHeight();

    // Set up mutation observer to detect changes in the DOM
    const observer = new MutationObserver(updateRibbonHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    // Also check on resize
    window.addEventListener("resize", updateRibbonHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateRibbonHeight);
    };
  }, []);

  // Handle scrolling effects
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Check if scrolling down and not at top
      if (currentScrollY > lastScrollY && currentScrollY > 70) {
        setIsNavbarVisible(false);
        clearTimeout(hideNavbarTimeout);
      } else {
        setIsNavbarVisible(true);

        // Set timeout to hide navbar after 3 seconds of no scroll
        clearTimeout(hideNavbarTimeout);
        hideNavbarTimeout = setTimeout(() => {
          if (window.scrollY > 70) {
            setIsNavbarVisible(false);
          }
        }, 3000);
      }

      lastScrollY = currentScrollY;
      setIsScrolled(currentScrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, {passive: true});
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(hideNavbarTimeout);
    };
  }, []);

  // Handle hover effect to keep navbar visible
  const handleMouseEnter = () => {
    setIsNavbarVisible(true);
    clearTimeout(hideNavbarTimeout);
  };

  // Handle click outside mobile menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        navbarRef.current &&
        !navbarRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <div
      ref={navbarRef}
      className={`fixed z-40 flex items-center justify-center w-full h-[70px] transition-all duration-500 rounded-b-xl
        ${isScrolled ? "bg-black/40 shadow-xl" : "bg-black/60"} 
        ${isNavbarVisible ? "translate-y-0" : "-translate-y-full"}`}
      style={{
        top: `${ribbonHeight}px`, // Position right below the ribbon
      }}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex flex-row no-wrap w-full items-center justify-between h-full bg-transparent text-white relative px-2 md:px-4">
        <Link
          href="/"
          className="flex flex-row gap-2 items-center justify-center hover:scale-x-105 transition-all duration-500 ease-in-out bg-transparent ml-4 md:ml-0"
        >
          <Image
            src={Logo}
            alt="Page Logo"
            width={300}
            height={300}
            className="w-[30px] md:w-[50px] h-[30px] md:h-[50px] object-fit rounded-[8px]"
          />
          <span className="text-[14px] md:text-[20px] font-bold">
            UniArchive
          </span>
        </Link>
        <div className="navv-cons flex flex-row items-center justify-end h-full w-full gap-4">
          <div className="nav-con hidden md:flex flex-row items-center justify-center gap-2 h-[40px]">
            <Link
              href="/"
              className="flex flex-col items-center justify-center transition-all duration-500 ease-in-out group px-4"
            >
              <span
                className={`text-[16px] font-semibold ${
                  pathname === "/"
                    ? "text-white"
                    : "text-white/70 group-hover:text-white"
                }`}
              >
                Home
              </span>
              <div
                className={`flex h-[2px] rounded transition-all duration-300 ease-in-out
                ${
                  pathname === "/"
                    ? "w-[50%] bg-white"
                    : "w-[3px] bg-white/60 group-hover:w-[25%] group-hover:bg-white"
                }`}
              ></div>
            </Link>
            <Link
              href="/school"
              className="flex flex-col items-center justify-center transition-all duration-500 ease-in-out group px-4"
            >
              <span
                className={`text-[16px] font-semibold ${
                  pathname === "/school"
                    ? "text-white"
                    : "text-white/70 group-hover:text-white"
                }`}
              >
                School
              </span>
              <div
                className={`flex h-[2px] rounded transition-all duration-300 ease-in-out
                ${
                  pathname === "/school"
                    ? "w-[50%] bg-white"
                    : "w-[3px] bg-white/60 group-hover:w-[25%] group-hover:bg-white"
                }`}
              ></div>
            </Link>

            <Link
              href="/about"
              className="flex flex-col items-center justify-center transition-all duration-500 ease-in-out group px-4"
            >
              <span
                className={`text-[16px] font-semibold ${
                  pathname === "/about"
                    ? "text-white"
                    : "text-white/70 group-hover:text-white"
                }`}
              >
                About
              </span>
              <div
                className={`flex h-[2px] rounded transition-all duration-300 ease-in-out
                ${
                  pathname === "/about"
                    ? "w-[50%] bg-white"
                    : "w-[3px] bg-white/60 group-hover:w-[25%] group-hover:bg-white"
                }`}
              ></div>
            </Link>
            <Link
              href="/contact"
              className="flex flex-col items-center justify-center transition-all duration-500 ease-in-out group px-4"
            >
              <span
                className={`text-[16px] font-semibold ${
                  pathname === "/contact"
                    ? "text-white"
                    : "text-white/70 group-hover:text-white"
                }`}
              >
                Contact
              </span>
              <div
                className={`flex h-[2px] rounded transition-all duration-300 ease-in-out
                ${
                  pathname === "/contact"
                    ? "w-[50%] bg-white"
                    : "w-[3px] bg-white/60 group-hover:w-[25%] group-hover:bg-white"
                }`}
              ></div>
            </Link>
          </div>
          <div className="search-con hidden md:flex h-full items-center justify-between">
            <div className="search-bar flex flex-row items-center justify-center bg-white/10 rounded-lg h-[40px] px-2">
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent text-white outline-none h-full w-full px-2"
              />
              <FaSearch className="text-white/50 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out" />
            </div>
          </div>
          <div className="user-con hidden md:flex items-center justify-center h-full">
            <FaUserCircle className="text-[26px] text-white/70 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out" />
          </div>
          <div className="mobile-search-btn flex md:hidden">
            <FaSearch
              className="text-white/50 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out text-[16px]"
              onClick={() => setIsMobileSearchOpen(true)}
            />
          </div>
          <div
            className={`mobile-search-con ${
              isMobileSearchOpen ? "flex" : "hidden"
            } flex-row absolute top-0 left-0 h-full w-full items-center justify-center gap-3 bg-black/90 z-50 transition-all duration-500 ease-in-out`}
            style={{
              animation: isMobileSearchOpen
                ? "var(--animate-slideDown)"
                : "var(--animate-slideUp)",
            }}
          >
            <div className="search-bar flex flex-row items-center justify-center bg-white/10 rounded-lg h-[40px] w-[85%] px-2">
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent text-white outline-none h-full w-full px-2"
              />
              <FaSearch className="text-white/50 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out" />
            </div>
            <div
              className="cancel text-[16px] rounded-full p-2 bg-white/30 cursor-pointer hover:text-black hover:bg-white/60"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              <FaXmark />
            </div>
          </div>
          <div className="mobile-menu-btn flex md:hidden">
            <IoMenu
              className="text-white/50 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out text-[18px]"
              onClick={() => setIsMobileMenuOpen(true)}
            />
          </div>
          <div
            className={`mobile-menu fixed top-0 left-0 h-screen w-[70%] bg-black/95 z-50 flex flex-col pt-16 px-6 ${
              isMobileMenuOpen ? "flex" : "hidden"
            }`}
            style={{
              transform: isMobileMenuOpen
                ? "translateX(0)"
                : "translateX(-100%)",
              opacity: isMobileMenuOpen ? "1" : "0",
              transition:
                "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
            }}
          >
            <div
              className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FaXmark size={24} />
            </div>
            <Link
              href="/"
              className={`flex items-center py-4 border-b border-white/10 ${
                pathname === "/" ? "text-white" : "text-white/70"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/school"
              className={`flex items-center py-4 border-b border-white/10 ${
                pathname === "/school" ? "text-white" : "text-white/70"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              School
            </Link>
            <Link
              href="/about"
              className={`flex items-center py-4 border-b border-white/10 ${
                pathname === "/about" ? "text-white" : "text-white/70"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={`flex items-center py-4 border-b border-white/10 ${
                pathname === "/contact" ? "text-white" : "text-white/70"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="flex items-center justify-center mt-8">
              <FaUserCircle className="text-[30px] text-white/70 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}