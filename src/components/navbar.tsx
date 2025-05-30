'use client'

import {useState, useEffect, useRef} from "react";
import { usePathname } from "next/navigation";
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/assets/img/logo/uniarchive.png';

// Import your custom hook
import { useNavConfig } from "@/hooks/useNavConfig";
import { useUser } from '@/context/userContext';

// import icons
import {FaUserCircle, FaSearch} from "react-icons/fa";
import {FaXmark} from 'react-icons/fa6';
import {IoMenu} from "react-icons/io5";


export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [ribbonHeight, setRibbonHeight] = useState(0);
  const navbarRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const hideNavbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const pathname = usePathname();
  const { 
    currentConfig, 
    userItems, 
    isCurrentRouteAccessible 
  } = useNavConfig();
  
  const { 
    userProfile, 
    hasActiveSession, 
    getUserDisplayName, 
    getUserInitials,
    getRoleDisplayName 
  } = useUser();

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
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 70) {
        setIsNavbarVisible(false);
        if (hideNavbarTimeoutRef.current) {
          clearTimeout(hideNavbarTimeoutRef.current);
        }
      } else {
        setIsNavbarVisible(true);

        // Set timeout to hide navbar after 3 seconds of no scroll
        if (hideNavbarTimeoutRef.current) {
          clearTimeout(hideNavbarTimeoutRef.current);
        }
        hideNavbarTimeoutRef.current = setTimeout(() => {
          if (window.scrollY > 70) {
            setIsNavbarVisible(false);
          }
        }, 3000);
      }

      lastScrollYRef.current = currentScrollY;
      setIsScrolled(currentScrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, {passive: true});
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideNavbarTimeoutRef.current) {
        clearTimeout(hideNavbarTimeoutRef.current);
      }
    };
  }, []);

  // Handle hover effect to keep navbar visible
  const handleMouseEnter = () => {
    setIsNavbarVisible(true);
    if (hideNavbarTimeoutRef.current) {
      clearTimeout(hideNavbarTimeoutRef.current);
    }
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

   // Create a state to track if the scroll ribbon is currently visible
  const [isRibbonVisible, setIsRibbonVisible] = useState(true);

  // Add a listener for custom ribbon visibility events
  useEffect(() => {
    const handleRibbonVisibilityChange = (event: CustomEvent) => {
      setIsRibbonVisible(event.detail.isVisible);
    };

    // Listen for the custom event from the ScrollRibbon component
    document.addEventListener(
      "ribbonVisibilityChanged",
      handleRibbonVisibilityChange as EventListener
    );

    return () => {
      document.removeEventListener(
        "ribbonVisibilityChanged",
        handleRibbonVisibilityChange as EventListener
      );
    };
  }, []);

  // Calculate the top position based on both ribbon height and visibility
  const calculateTopPosition = () => {
    // Only use the ribbon height if it's both visible and we're scrolled
    if (isScrolled && isRibbonVisible && ribbonHeight > 0) {
      return `${ribbonHeight}px`;
    }
    // Otherwise position at the top
    return `${ribbonHeight}px`;
  };

  // Don't render navbar if user can't access current route
  if (!isCurrentRouteAccessible) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access this page.</p>
          <Link href="/" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

 

  return (
    <div
      ref={navbarRef}
      className={`fixed z-90 flex items-center justify-center w-full transition-all duration-500 rounded-b-xl
        ${isScrolled ? "bg-black/50 shadow-xl" : "bg-black/60"} 
        ${
          isNavbarVisible
            ? "translate-y-0 h-[70px]"
            : "-translate-y-full hidden h-0"
        }`}
      style={{
        top: calculateTopPosition(),
      }}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex flex-row no-wrap w-full items-center justify-between h-full bg-transparent text-white relative px-2 md:px-4">
        {/* Logo and Title */}
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
            {currentConfig.title || "UniArchive"}
          </span>
        </Link>

        <div className="navv-cons flex flex-row items-center justify-end h-full w-[60%] gap-4">
          {/* Navigation Items - Desktop */}
          <div className="nav-con hidden md:flex flex-row items-center justify-center gap-2 h-[40px]">
            {currentConfig.items.map((item, index) => (
              <Link
                key={index}
                href={item.path}
                className="flex flex-col items-center justify-center transition-all duration-500 ease-in-out group px-4"
              >
                <span
                  className={`text-[16px] font-semibold ${
                    pathname === item.path
                      ? "text-white"
                      : "text-white/70 group-hover:text-white"
                  }`}
                >
                  {item.name}
                </span>
                <div
                  className={`flex h-[2px] rounded transition-all duration-300 ease-in-out
                  ${
                    pathname === item.path
                      ? "w-[50%] bg-white"
                      : "w-[3px] bg-white/60 group-hover:w-[25%] group-hover:bg-white"
                  }`}
                ></div>
              </Link>
            ))}
          </div>

          {/* Additional Actions - Desktop */}
          {currentConfig.additionalActions && currentConfig.additionalActions.length > 0 && (
            <div className="additional-actions hidden md:flex flex-row items-center justify-center gap-2 h-[40px]">
              {currentConfig.additionalActions.map((action, index) => (
                <Link
                  key={`action-${index}`}
                  href={action.path}
                  className="flex items-center justify-center text-center px-3 py-1 rounded-md h-[40px] bg-white/10 hover:bg-white/20 transition-all duration-300"
                >
                  <span className="text-[12px] xl:text-[14px] font-medium text-white">
                    {action.name}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Search Bar */}
          {currentConfig.showSearch && (
            <>
              {/* Desktop Search */}
              <div className="search-con hidden xl:flex h-full items-center justify-between">
                <div className="search-bar flex flex-row items-center justify-center bg-white/10 rounded-lg h-[40px] px-2">
                  <input
                    type="text"
                    placeholder="Search"
                    className="bg-transparent text-white outline-none h-full w-full px-2"
                  />
                  <FaSearch className="text-white/50 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out" />
                </div>
              </div>

              {/* Mobile Search Button */}
              <div className="mobile-search-btn flex xl:hidden">
                <FaSearch
                  className="text-white/50 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out text-[16px]"
                  onClick={() => setIsMobileSearchOpen(true)}
                />
              </div>

              {/* Mobile Search Overlay */}
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
            </>
          )}

          {/* User Icon - Desktop */}
          <div className="user-con hidden md:flex items-center justify-center h-full">
            {hasActiveSession && userProfile ? (
              <div className="user-profile flex items-center gap-2">
                {userProfile.profilePhoto ? (
                  <Image
                    src={userProfile.profilePhoto}
                    alt="Profile"
                    width={26}
                    height={26}
                    className="w-[26px] h-[26px] rounded-full object-cover border-2 border-white/30 hover:border-white/60 transition-all duration-300"
                  />
                ) : (
                  <div className="w-[26px] h-[26px] rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold text-white border-2 border-white/30 hover:border-white/60 hover:bg-white/30 transition-all duration-300">
                    {getUserInitials()}
                  </div>
                )}
                <div className="hidden lg:flex flex-col">
                  <span className="text-xs text-white/70 leading-none">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-[10px] text-white/50 leading-none">
                    {getRoleDisplayName()}
                  </span>
                </div>
              </div>
            ) : (
              <Link href="/auth/signin">
                <FaUserCircle className="text-[26px] text-white/70 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="mobile-menu-btn flex md:hidden">
            <IoMenu
              className="text-white/50 hover:text-white hover:scale-105 cursor-pointer transition-all duration-500 ease-in-out text-[18px]"
              onClick={() => setIsMobileMenuOpen(true)}
            />
          </div>

          {/* Mobile Menu */}
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
            {/* Mobile Menu Close Button */}
            <div
              className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FaXmark size={24} />
            </div>

            {/* User Profile Section - Mobile */}
            {hasActiveSession && userProfile && (
              <div className="mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  {userProfile.profilePhoto ? (
                    <Image
                      src={userProfile.profilePhoto}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="w-[40px] h-[40px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-[40px] h-[40px] rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold text-white">
                      {getUserInitials()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-white font-medium">
                      {getUserDisplayName()}
                    </span>
                    <span className="text-xs text-white/70">
                      {getRoleDisplayName()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Menu Items */}
            {currentConfig.items.map((item, index) => (
              <Link
                key={index}
                href={item.path}
                className={`flex items-center py-4 border-b border-white/10 ${
                  pathname === item.path
                    ? "text-white"
                    : "text-white/70"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile User-Specific Items */}
            {userItems && userItems.length > 0 && (
              <>
                <div className="mt-6 mb-2 text-white/50 text-sm">
                  User Actions
                </div>
                {userItems.map((item, index) => (
                  <Link
                    key={`user-item-${index}`}
                    href={item.path}
                    className="flex items-center py-4 border-b border-white/10 text-white/70"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </>
            )}

            {/* Mobile Additional Actions */}
            {currentConfig.additionalActions && currentConfig.additionalActions.length > 0 && (
              <>
                <div className="mt-6 mb-2 text-white/50 text-sm">
                  Additional Actions
                </div>
                {currentConfig.additionalActions.map((action, index) => (
                  <Link
                    key={`mobile-action-${index}`}
                    href={action.path}
                    className="flex items-center py-4 border-b border-white/10 text-white/70"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {action.name}
                  </Link>
                ))}
              </>
            )}

            {/* Mobile Sign In/Out */}
            {!hasActiveSession && (
              <div className="flex items-center justify-center mt-8">
                <Link 
                  href="/auth/signin"
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FaUserCircle className="text-[20px] text-white/70" />
                  <span className="text-white/70">Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};