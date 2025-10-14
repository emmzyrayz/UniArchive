"use client";

import { useState, useRef, useEffect, ChangeEvent, ReactElement } from "react";
import { Input, Card } from "@/components/UI";
import {
  LuSearch,
  LuBook,
  LuUser,
  LuFolderOpen,
  LuFileText,
  LuClock,
} from "react-icons/lu";

interface SearchSuggestion {
  id: string;
  title: string;
  description?: string;
  type: "course" | "lesson" | "instructor" | "category";
  image?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  loading?: boolean;
  className?: string;
  debounceMs?: number;
  showRecentSearches?: boolean;
  recentSearches?: string[];
  onClearRecentSearches?: () => void;
}

export default function SearchBar({
  placeholder = "Search courses, lessons, instructors...",
  onSearch,
  suggestions = [],
  onSuggestionSelect,
  loading = false,
  className = "",
  debounceMs = 300,
  showRecentSearches = false,
  recentSearches,
  onClearRecentSearches,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        onSearch(query);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs, onSearch]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    onSuggestionSelect?.(suggestion);
  };

  const handleClearSearch = () => {
    setQuery("");
    setShowSuggestions(false);
  };

  const getTypeIcon = (type: SearchSuggestion["type"]): ReactElement => {
    const icons = {
      course: <LuBook className="w-4 h-4" />,
      lesson: <LuFileText className="w-4 h-4" />,
      instructor: <LuUser className="w-4 h-4" />,
      category: <LuFolderOpen className="w-4 h-4" />,
    };

    return icons[type];
  };

  const getTypeColor = (type: SearchSuggestion["type"]): string => {
    const colors = {
      course: "text-blue-600 bg-blue-50",
      lesson: "text-green-600 bg-green-50",
      instructor: "text-purple-600 bg-purple-50",
      category: "text-orange-600 bg-orange-50",
    };

    return colors[type];
  };

  const shouldShowDropdown = showSuggestions && query.trim().length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Input
          name="search"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          icon={
            loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
            ) : (
              <LuSearch className="w-4 h-4" />
            )
          }
          className="w-full"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {shouldShowDropdown && suggestions.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowSuggestions(false)}
          />

          {/* Dropdown */}
          <Card
            variant="elevated"
            padding="sm"
            className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto z-20"
          >
            <div className="space-y-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(
                        suggestion.type
                      )}`}
                    >
                      {getTypeIcon(suggestion.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                          {suggestion.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize ${getTypeColor(
                            suggestion.type
                          )}`}
                        >
                          {suggestion.type}
                        </span>
                      </div>
                      {suggestion.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {suggestion.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* No Results */}
      {shouldShowDropdown && suggestions.length === 0 && !loading && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowSuggestions(false)}
          />
          <Card
            variant="elevated"
            padding="md"
            className="absolute top-full left-0 right-0 mt-2 z-20"
          >
            <div className="text-center py-6">
              <LuSearch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-900 font-medium mb-1">No results found</p>
              <p className="text-sm text-gray-500">
                Try searching with different keywords
              </p>
            </div>
          </Card>
        </>
      )}

      {/* Loading State */}
      {shouldShowDropdown && loading && suggestions.length === 0 && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowSuggestions(false)}
          />
          <Card
            variant="elevated"
            padding="md"
            className="absolute top-full left-0 right-0 mt-2 z-20"
          >
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {showRecentSearches &&
        !query &&
        recentSearches &&
        recentSearches.length > 0 && (
          <Card
            variant="elevated"
            padding="sm"
            className="absolute top-full left-0 right-0 mt-2 z-20"
          >
            <div className="p-2">
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-xs font-medium text-gray-500">
                  Recent Searches
                </span>
                <button
                  onClick={onClearRecentSearches}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(search)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50"
                >
                  <LuClock className="w-4 h-4 inline mr-2 text-gray-400" />
                  {search}
                </button>
              ))}
            </div>
          </Card>
        )}
    </div>
  );
}
