"use client";

import { useState } from "react";
import { SearchBar } from "./reuse";
import {
  mockCategories,
  mockCourses,
  mockInstructors,
  mockLessons,
} from "@/assets/data/dummy";
import { SearchSuggestion } from "./reuse/searchbar";
import {
  LuMenu,
  LuX,
  LuChevronDown,
  LuLogOut,
  LuSettings,
  LuUser,
} from "react-icons/lu";

export default function Navbar() {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setLoading(true);

    setTimeout(() => {
      const query = searchQuery.toLowerCase();

      const results = [
        ...mockCourses.filter(
          (c) =>
            c.title.toLowerCase().includes(query) ||
            c.description?.toLowerCase().includes(query)
        ),
        ...mockLessons.filter(
          (l) =>
            l.title.toLowerCase().includes(query) ||
            l.description?.toLowerCase().includes(query)
        ),
        ...mockInstructors.filter(
          (i) =>
            i.title.toLowerCase().includes(query) ||
            i.description?.toLowerCase().includes(query)
        ),
        ...mockCategories.filter(
          (cat) =>
            cat.title.toLowerCase().includes(query) ||
            cat.description?.toLowerCase().includes(query)
        ),
      ];

      setSuggestions(results.slice(0, 10));
      setLoading(false);
    }, 600);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    console.log(`Selected ${suggestion.type}:`, suggestion.title);
    setMobileMenuOpen(false);

    switch (suggestion.type) {
      case "course":
        console.log("Navigate to course page");
        break;
      case "lesson":
        console.log("Navigate to lesson page");
        break;
      case "instructor":
        console.log("Navigate to instructor profile");
        break;
      case "category":
        console.log("Navigate to category page");
        break;
    }
  };

  const navLinks = [
    { label: "Courses", href: "#" },
    { label: "Faculty", href: "#" },
    { label: "Department", href: "#" },
    { label: "School", href: "#" },
  ];

  return (
    <nav className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex flex-row items-center justify-between h-16 md:h-20 gap-4 md:gap-2">
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center gap-2 min-w-fit">
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-bold text-gray-900">
                Uni Archive
              </span>
              <p className="hidden sm:block text-xs text-gray-500 whitespace-nowrap">
                Academic Hub
              </p>
            </div>
          </div>

          {/* Search Bar - Hidden on Mobile, Visible on Tablet+ */}
          <div className="hidden md:flex flex-1 items-center justify-center mx-6 lg:mx-8">
            <SearchBar
              placeholder="Search courses..."
              onSearch={handleSearch}
              suggestions={suggestions}
              loading={loading}
              onSuggestionSelect={handleSuggestionSelect}
            />
          </div>

          {/* Desktop Navigation Links - Hidden on Mobile and Tablet */}
          <div className="hidden lg:flex items-center gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-gray-700 hover:text-indigo-600 hover:bg-gray-300 transition-colors font-medium text-sm p-2 rounded-lg"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* User Profile Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* User Profile Button */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  JD
                </div>
                <LuChevronDown
                  className={`w-4 h-4 text-gray-600 hidden sm:block transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-40 border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="font-medium text-gray-900 text-sm">
                        John Doe
                      </p>
                      <p className="text-xs text-gray-500">john@example.com</p>
                    </div>
                    <div className="py-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LuUser className="w-4 h-4" />
                        My Profile
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LuSettings className="w-4 h-4" />
                        Settings
                      </button>
                    </div>
                    <div className="border-t border-gray-200 py-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LuLogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle - Hidden on Desktop */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <LuX className="w-6 h-6 text-gray-900" />
              ) : (
                <LuMenu className="w-6 h-6 text-gray-900" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Visible on Mobile */}
        <div className="md:hidden pb-4">
          <SearchBar
            placeholder="Search courses..."
            onSearch={handleSearch}
            suggestions={suggestions}
            loading={loading}
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>

        {/* Mobile Menu - Visible when toggled */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
