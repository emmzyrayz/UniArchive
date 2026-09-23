// src/components/UI/navbar.tsx
"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useNavConfig } from "@/hooks/useNavConfig";
import { useUser } from "@/context/userContext";
import BrandLogo from "@/app/auth/components/UI/BrandLogo";
import { Button } from "@/components/UI/Buttons";

// navbar.tsx — add after impor

// ─── Inline icons ─────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function TabIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactElement> = {
    home: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    layout: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    upload: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    user: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  };
  return icons[name] ?? null;
}

// ─── User Avatar ──────────────────────────────────────────────────────────────

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold ring-2 ring-primary/50 select-none">
      {initials}
    </div>
  );
}

// ─── User Dropdown ────────────────────────────────────────────────────────────

function UserDropdown({ onClose }: { onClose: () => void }) {
  const { getUserDisplayName, getRoleDisplayName, logout } = useUser();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);


  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur-md shadow-2xl overflow-hidden z-50"
    >
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-sm font-semibold text-white truncate">
          {getUserDisplayName?.()}
        </p>
        <p className="text-xs text-white/50 truncate capitalize">
          {getRoleDisplayName?.()}
        </p>
      </div>
      <div className="py-1">
        {[
          { label: "My Library", href: "/home" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile", href: "/profile" },
          { label: "Settings", href: "/settings" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          disabled={isSigningOut}
          onClick={async () => {
            setIsSigningOut(true);
            await logout();
            onClose();
            router.push("/");
          }}
          className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/10 transition-colors border-t border-white/10 mt-1"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Access Denied ────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 bg-surface rounded-xl border border-border shadow-sm">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Access Denied
        </h1>
        <p className="text-text-secondary mb-6">
          You don&apos;t have permission to access this page.
        </p>
        <Button href="/">Go Home</Button>
      </div>
    </div>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────

function MobileTabBar() {
  const { mobileTabs, isActive } = useNavConfig();
  if (!mobileTabs.length) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex xl:hidden border-t border-white/10 bg-neutral-900/95 backdrop-blur-md">
      {mobileTabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
              active ? "text-primary" : "text-white/50 hover:text-white/80"
            }`}
          >
            {tab.icon && <TabIcon name={tab.icon} />}
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ribbonHeight, setRibbonHeight] = useState(0);

  const navbarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideNavbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastScrollYRef = useRef(0);

  const pathname = usePathname();
  const {
    currentConfig,
    userItems,
    isCurrentRouteAccessible,
    isActive,
    hasActiveSession,
    mobileTabs,
  } = useNavConfig();

  const { getUserDisplayName, getUserInitials, userProfile } = useUser();

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY) * -1);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [isMobileMenuOpen]);

  // Detect ribbon height
  useEffect(() => {
    const update = () => {
      const ribbon = document.querySelector(".scroll-ribbon") as HTMLElement;
      setRibbonHeight(ribbon ? ribbon.offsetHeight : 0);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Hide navbar on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollYRef.current && currentY > 70) {
        setIsNavbarVisible(false);
        setOpenDropdown(null);
      } else {
        setIsNavbarVisible(true);
      }
      lastScrollYRef.current = currentY;
      setIsScrolled(currentY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideNavbarTimeoutRef.current)
        clearTimeout(hideNavbarTimeoutRef.current);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (navbarRef.current && !navbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    startTransition(() => {
      setIsMobileMenuOpen(false);
      setOpenDropdown(null);
    });
  }, [pathname]);

  if (!isCurrentRouteAccessible) return <AccessDenied />;

  return (
    <>
      <div
        ref={navbarRef}
        onMouseEnter={() => setIsNavbarVisible(true)}
        className={`fixed z-50 flex items-center justify-center w-full transition-all duration-500 rounded-b-xl
          ${isScrolled ? "bg-black/50 shadow-xl backdrop-blur-md" : "bg-black/60"}
          ${isNavbarVisible ? "translate-y-0 h-[70px]" : "-translate-y-full h-0 overflow-hidden"}
        `}
        style={{ top: `${ribbonHeight}px` }}
      >
        <div className="flex flex-row w-full items-center justify-between h-full bg-transparent text-white px-4 max-w-7xl mx-auto gap-4">
          {/* Brand */}
          <Link
            href={hasActiveSession ? "/home" : "/"}
            className="flex items-center gap-2 shrink-0 hover:scale-105 transition-transform duration-300"
          >
            <BrandLogo size={40} className="text-white" />
            <span className="text-base md:text-lg font-bold text-white tracking-tight hidden sm:block">
              {currentConfig.title || "UniArchive"}
            </span>
          </Link>

          <div className="flex flex-row items-center justify-end h-full w-auto gap-4">
            {/* Standalone nav links — desktop */}
            <nav className="hidden xl:flex items-center gap-1 h-10">
              {currentConfig.standaloneItems?.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className="flex flex-col items-center px-2 group"
                >
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? "text-white"
                        : "text-white/70 group-hover:text-white"
                    }`}
                  >
                    {item.name}
                  </span>
                  <div
                    className={`h-[2px] rounded mt-1 transition-all duration-300 ${
                      isActive(item.path)
                        ? "w-1/2 bg-primary"
                        : "w-[3px] bg-white/60 group-hover:w-1/4 group-hover:bg-primary"
                    }`}
                  />
                </Link>
              ))}

              {/* Dropdown categories — desktop */}
              {currentConfig.categories?.map((category) => (
                <div
                  key={category.name}
                  className="relative"
                  onMouseEnter={() => {
                    if (dropdownTimeoutRef.current)
                      clearTimeout(dropdownTimeoutRef.current);
                    setOpenDropdown(category.name);
                  }}
                  onMouseLeave={() => {
                    dropdownTimeoutRef.current = setTimeout(
                      () => setOpenDropdown(null),
                      200,
                    );
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                  >
                    {category.name}
                    <ChevronDownIcon open={openDropdown === category.name} />
                  </button>
                  <AnimatePresence>
                    {openDropdown === category.name && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-52 bg-neutral-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden"
                      >
                        {category.items.map((item) => (
                          <Link
                            key={item.path}
                            href={item.path}
                            onClick={() => setOpenDropdown(null)}
                            className={`block px-4 py-3 text-sm border-b border-white/5 last:border-b-0 hover:bg-white/10 transition-colors ${
                              isActive(item.path)
                                ? "text-primary font-semibold bg-white/5"
                                : "text-white/80 hover:text-white"
                            }`}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Additional actions — desktop */}
            {currentConfig.additionalActions &&
              currentConfig.additionalActions.length > 0 && (
                <div className="hidden xl:flex items-center gap-2">
                  {currentConfig.additionalActions.map((action) => (
                    <Link
                      key={action.path}
                      href={action.path}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-md border border-white/5 transition-colors"
                    >
                      {action.name}
                    </Link>
                  ))}
                </div>
              )}

            {/* Search — desktop */}
            {currentConfig.showSearch && (
              <>
                <div className="hidden xl:flex items-center bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg h-10 px-3 gap-2 transition-colors">
                  <input
                    type="text"
                    placeholder="Search archive..."
                    className="bg-transparent text-sm text-white placeholder-white/50 outline-none w-40 focus:w-56 transition-all duration-300"
                  />
                  <SearchIcon />
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="flex xl:hidden text-white/70 hover:text-white transition-colors"
                  aria-label="Search"
                >
                  <SearchIcon />
                </button>
              </>
            )}

            {/* User section — desktop */}
            <div className="hidden xl:flex items-center pl-2 border-l border-white/10">
              {hasActiveSession ? (
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-label="User menu"
                    aria-expanded={dropdownOpen}
                    className="flex items-center gap-2.5 cursor-pointer group focus:outline-none"
                  >
                    <UserAvatar name={getUserDisplayName?.() ?? "User"} />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-white/90 group-hover:text-white leading-tight">
                        {getUserDisplayName?.()}
                      </span>
                      <span className="text-[11px] text-white/50 leading-tight capitalize">
                        {userProfile?.role?.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                  <AnimatePresence>
                    {dropdownOpen && (
                      <UserDropdown onClose={() => setDropdownOpen(false)} />
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth?view=signin"
                    className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5"
                  >
                    Sign In
                  </Link>
                  <Button href="/auth?view=signup" size="md">
                    Get Started
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex xl:hidden text-white/80 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-start pt-20 gap-4 bg-black/95 backdrop-blur-md"
          >
            <div className="flex items-center bg-white/10 rounded-xl h-12 w-[90%] px-4 border border-white/20 gap-3">
              <input
                autoFocus
                type="text"
                placeholder="Search anything..."
                className="bg-transparent text-white placeholder-white/50 outline-none flex-1 text-base"
              />
              <SearchIcon />
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="absolute top-6 right-6 text-white/50 hover:text-white p-2 bg-white/10 rounded-full"
              aria-label="Close search"
            >
              <CloseIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: isMobileMenuOpen ? 0 : "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-screen w-[80%] max-w-[320px] bg-neutral-900 border-l border-white/10 shadow-2xl z-[80] flex flex-col xl:hidden"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
          <span className="font-bold text-white">Menu</span>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white/50 hover:text-white p-1.5 bg-white/5 rounded-full"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Authenticated user profile strip */}
          {hasActiveSession && (
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/10">
              <UserAvatar name={getUserDisplayName?.() ?? "User"} />
              <div>
                <p className="text-sm font-semibold text-white">
                  {getUserDisplayName?.()}
                </p>
                <p className="text-xs text-primary capitalize">
                  {userProfile?.role?.replace("_", " ")}
                </p>
              </div>
            </div>
          )}

          {/* Standalone items */}
          {currentConfig.standaloneItems?.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center py-3.5 border-b border-white/5 text-base font-medium transition-colors ${
                isActive(item.path)
                  ? "text-primary"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}

          {/* Categories */}
          {currentConfig.categories?.map((category) => (
            <div key={category.name} className="mt-5">
              <p className="text-white/40 text-xs tracking-wider uppercase font-bold mb-2">
                {category.name}
              </p>
              <div className="space-y-0.5">
                {category.items.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center py-2.5 px-3 rounded-lg transition-colors text-sm ${
                      isActive(item.path)
                        ? "text-primary bg-primary/10 font-medium"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* User-specific items */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-white/40 text-xs tracking-wider uppercase font-bold mb-2">
              Account
            </p>
            <div className="space-y-0.5">
              {userItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center py-2.5 px-3 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sign in CTA for guests */}
        {!hasActiveSession && (
          <div className="px-4 py-4 border-t border-white/10">
            <Link
              href="/auth?view=signin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Sign In to UniArchive
            </Link>
          </div>
        )}
      </motion.div>

      {/* Mobile bottom tab bar — authenticated only */}
      {hasActiveSession && mobileTabs.length > 0 && <MobileTabBar />}
    </>
  );
};
