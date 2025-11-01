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
import { ImageSource } from "@/assets/data/imagesData";

export interface SearchSuggestion {
  id: string;
  title: string;
  description?: string;
  type: "course" | "lesson" | "instructor" | "category";
  image?: ImageSource;
  metadata?: Record<string, string | number | boolean>;
}

export interface SearchBarProps {
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
    <div
      className={`relative items-center justify-center h-full w-full ${className}`}
    >
      {/* Search Input */}
      <div className="flex-row h-full w-full flex items-center justify-center">
        <Input
          name="search"
          placeholder={placeholder}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          icon={
            loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
            ) : (
              <LuSearch className="w-4 h-4" />
            )
          }
          showCancelButton={true}
          onCancel={handleClearSearch}
          className="w-full h-full"
        />
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


// Usage Examples:
// ============================================
// SEARCHBAR USAGE EXAMPLES
// ============================================

// import { useState, useEffect } from "react";
// import SearchBar from "@/components/reuse/searchbar";
// import { SearchSuggestion } from "@/components/reuse/searchbar";

// // Mock data
// const mockCourses: SearchSuggestion[] = [
//   {
//     id: "course-1",
//     title: "Introduction to React",
//     description: "Learn the basics of React and build interactive UIs",
//     type: "course",
//     image: "/courses/react.jpg",
//     metadata: {
//       level: "Beginner",
//       instructor: "John Doe",
//       students: 1250,
//     },
//   },
//   {
//     id: "course-2",
//     title: "Advanced React Patterns",
//     description: "Master advanced React patterns and best practices",
//     type: "course",
//     image: "/courses/react-advanced.jpg",
//     metadata: {
//       level: "Advanced",
//       instructor: "Jane Smith",
//       students: 450,
//     },
//   },
//   {
//     id: "course-3",
//     title: "Node.js Backend Development",
//     description: "Build scalable backend applications with Node.js",
//     type: "course",
//     metadata: {
//       level: "Intermediate",
//       instructor: "Mike Johnson",
//       students: 890,
//     },
//   },
// ];

// const mockLessons: SearchSuggestion[] = [
//   {
//     id: "lesson-1",
//     title: "Understanding Components",
//     description: "Deep dive into React components and their lifecycle",
//     type: "lesson",
//     metadata: {
//       course: "Introduction to React",
//       duration: 45,
//     },
//   },
//   {
//     id: "lesson-2",
//     title: "State Management with Redux",
//     description: "Learn how to manage application state effectively",
//     type: "lesson",
//     metadata: {
//       course: "Advanced React Patterns",
//       duration: 60,
//     },
//   },
// ];

// const mockInstructors: SearchSuggestion[] = [
//   {
//     id: "instructor-1",
//     title: "John Doe",
//     description: "React and Frontend Development Expert",
//     type: "instructor",
//     image: "/instructors/john.jpg",
//     metadata: {
//       expertise: "Frontend",
//       courses: 5,
//       students: 3200,
//     },
//   },
//   {
//     id: "instructor-2",
//     title: "Jane Smith",
//     description: "Full Stack Developer and Mentor",
//     type: "instructor",
//     image: "/instructors/jane.jpg",
//     metadata: {
//       expertise: "Full Stack",
//       courses: 8,
//       students: 4500,
//     },
//   },
// ];

// const mockCategories: SearchSuggestion[] = [
//   {
//     id: "category-1",
//     title: "Web Development",
//     description: "Explore frontend and backend web development courses",
//     type: "category",
//     metadata: {
//       courses: 24,
//       students: 15000,
//     },
//   },
//   {
//     id: "category-2",
//     title: "Mobile Development",
//     description: "Build iOS and Android applications",
//     type: "category",
//     metadata: {
//       courses: 18,
//       students: 8500,
//     },
//   },
// ];

// // ============================================
// // EXAMPLE 1: BASIC SEARCH BAR
// // ============================================
// export function BasicSearchExample() {
//   const [query, setQuery] = useState("");

//   const handleSearch = (searchQuery: string) => {
//     console.log("Searching for:", searchQuery);
//     setQuery(searchQuery);
//   };

//   return (
//     <SearchBar
//       placeholder="Search for courses..."
//       onSearch={handleSearch}
//       suggestions={mockCourses}
//       onSuggestionSelect={(suggestion) => {
//         console.log("Selected:", suggestion);
//       }}
//     />
//   );
// }

// // ============================================
// // EXAMPLE 2: SEARCH WITH LOADING STATE
// // ============================================
// export function SearchWithLoadingExample() {
//   const [query, setQuery] = useState("");
//   const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
//   const [loading, setLoading] = useState(false);

//   const handleSearch = async (searchQuery: string) => {
//     setLoading(true);
//     setQuery(searchQuery);

//     // Simulate API call
//     setTimeout(() => {
//       if (searchQuery.toLowerCase().includes("react")) {
//         setSuggestions(mockCourses.filter((c) =>
//           c.title.toLowerCase().includes("react")
//         ));
//       } else {
//         setSuggestions(mockCourses);
//       }
//       setLoading(false);
//     }, 500);
//   };

//   return (
//     <SearchBar
//       placeholder="Search courses..."
//       onSearch={handleSearch}
//       suggestions={suggestions}
//       loading={loading}
//       onSuggestionSelect={(suggestion) => {
//         console.log("Selected course:", suggestion.title);
//       }}
//     />
//   );
// }

// // ============================================
// // EXAMPLE 3: UNIVERSAL SEARCH (Mixed results)
// // ============================================
// export function UniversalSearchExample() {
//   const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
//   const [loading, setLoading] = useState(false);

//   const handleSearch = async (searchQuery: string) => {
//     setLoading(true);

//     // Simulate fetching from multiple sources
//     setTimeout(() => {
//       const query = searchQuery.toLowerCase();

//       const results = [
//         ...mockCourses.filter(
//           (c) =>
//             c.title.toLowerCase().includes(query) ||
//             c.description?.toLowerCase().includes(query)
//         ),
//         ...mockLessons.filter(
//           (l) =>
//             l.title.toLowerCase().includes(query) ||
//             l.description?.toLowerCase().includes(query)
//         ),
//         ...mockInstructors.filter(
//           (i) =>
//             i.title.toLowerCase().includes(query) ||
//             i.description?.toLowerCase().includes(query)
//         ),
//         ...mockCategories.filter(
//           (cat) =>
//             cat.title.toLowerCase().includes(query) ||
//             cat.description?.toLowerCase().includes(query)
//         ),
//       ];

//       setSuggestions(results.slice(0, 10)); // Limit to 10 results
//       setLoading(false);
//     }, 600);
//   };

//   const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
//     console.log(`Selected ${suggestion.type}:`, suggestion.title);

//     // Navigate based on type
//     switch (suggestion.type) {
//       case "course":
//         console.log("Navigate to course page");
//         break;
//       case "lesson":
//         console.log("Navigate to lesson page");
//         break;
//       case "instructor":
//         console.log("Navigate to instructor profile");
//         break;
//       case "category":
//         console.log("Navigate to category page");
//         break;
//     }
//   };

//   return (
//     <SearchBar
//       placeholder="Search courses, lessons, instructors, categories..."
//       onSearch={handleSearch}
//       suggestions={suggestions}
//       loading={loading}
//       onSuggestionSelect={handleSuggestionSelect}
//     />
//   );
// }

// // ============================================
// // EXAMPLE 4: SEARCH WITH RECENT SEARCHES
// // ============================================
// export function SearchWithRecentExample() {
//   const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [recentSearches, setRecentSearches] = useState<string[]>([
//     "React Hooks",
//     "State Management",
//     "JavaScript Basics",
//     "Web Development",
//   ]);

//   const handleSearch = async (searchQuery: string) => {
//     setLoading(true);

//     // Add to recent searches
//     setRecentSearches((prev) => {
//       const filtered = prev.filter((s) => s !== searchQuery);
//       return [searchQuery, ...filtered].slice(0, 5); // Keep last 5
//     });

//     // Simulate API call
//     setTimeout(() => {
//       const query = searchQuery.toLowerCase();
//       const results = mockCourses.filter(
//         (c) =>
//           c.title.toLowerCase().includes(query) ||
//           c.description?.toLowerCase().includes(query)
//       );
//       setSuggestions(results);
//       setLoading(false);
//     }, 500);
//   };

//   return (
//     <SearchBar
//       placeholder="Search courses..."
//       onSearch={handleSearch}
//       suggestions={suggestions}
//       loading={loading}
//       showRecentSearches={true}
//       recentSearches={recentSearches}
//       onClearRecentSearches={() => setRecentSearches([])}
//       onSuggestionSelect={(suggestion) => {
//         console.log("Selected:", suggestion.title);
//       }}
//     />
//   );
// }

// // ============================================
// // EXAMPLE 5: ADVANCED SEARCH PAGE (Complete Example)
// // ============================================
// export function AdvancedSearchPageExample() {
//   const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [recentSearches, setRecentSearches] = useState<string[]>([
//     "Web Development",
//     "React",
//   ]);
//   const [selectedResult, setSelectedResult] = useState<SearchSuggestion | null>(
//     null
//   );

//   const handleSearch = async (searchQuery: string) => {
//     setLoading(true);

//     // Add to recent searches
//     setRecentSearches((prev) => {
//       const filtered = prev.filter((s) => s !== searchQuery);
//       return [searchQuery, ...filtered].slice(0, 8);
//     });

//     // Simulate API call with comprehensive search
//     setTimeout(() => {
//       const query = searchQuery.toLowerCase();

//       const results = [
//         ...mockCourses.filter(
//           (c) =>
//             c.title.toLowerCase().includes(query) ||
//             c.description?.toLowerCase().includes(query)
//         ),
//         ...mockLessons.filter(
//           (l) =>
//             l.title.toLowerCase().includes(query) ||
//             l.description?.toLowerCase().includes(query)
//         ),
//         ...mockInstructors.filter(
//           (i) =>
//             i.title.toLowerCase().includes(query) ||
//             i.description?.toLowerCase().includes(query)
//         ),
//         ...mockCategories.filter(
//           (cat) =>
//             cat.title.toLowerCase().includes(query) ||
//             cat.description?.toLowerCase().includes(query)
//         ),
//       ].slice(0, 12); // Limit total results

//       setSuggestions(results);
//       setLoading(false);
//     }, 700);
//   };

//   const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
//     setSelectedResult(suggestion);

//     // Navigate or perform action
//     console.log(`Navigating to ${suggestion.type}:`, suggestion.title);

//     const routes = {
//       course: `/courses/${suggestion.id}`,
//       lesson: `/lessons/${suggestion.id}`,
//       instructor: `/instructors/${suggestion.id}`,
//       category: `/categories/${suggestion.id}`,
//     };

//     console.log("Would navigate to:", routes[suggestion.type]);
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-8">
//       <div className="max-w-2xl mx-auto">
//         <div className="mb-8">
//           <h1 className="text-4xl font-bold text-gray-900 mb-2">
//             Search Uni Archive
//           </h1>
//           <p className="text-gray-600">
//             Find courses, lessons, instructors, and categories
//           </p>
//         </div>

//         {/* Search Bar */}
//         <SearchBar
//           placeholder="Search courses, lessons, instructors..."
//           onSearch={handleSearch}
//           suggestions={suggestions}
//           loading={loading}
//           debounceMs={300}
//           showRecentSearches={true}
//           recentSearches={recentSearches}
//           onClearRecentSearches={() => setRecentSearches([])}
//           onSuggestionSelect={handleSuggestionSelect}
//           className="mb-8"
//         />

//         {/* Selected Result Preview */}
//         {selectedResult && (
//           <div className="bg-white rounded-lg shadow p-6 mb-8">
//             <div className="flex items-start gap-4">
//               {selectedResult.image && (
//                 <img
//                   src={selectedResult.image}
//                   alt={selectedResult.title}
//                   className="w-24 h-24 object-cover rounded-lg"
//                 />
//               )}
//               <div>
//                 <div className="flex items-center gap-2 mb-2">
//                   <h2 className="text-2xl font-bold text-gray-900">
//                     {selectedResult.title}
//                   </h2>
//                   <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
//                     {selectedResult.type}
//                   </span>
//                 </div>
//                 {selectedResult.description && (
//                   <p className="text-gray-600 mb-3">{selectedResult.description}</p>
//                 )}
//                 {selectedResult.metadata && (
//                   <div className="text-sm text-gray-500">
//                     {Object.entries(selectedResult.metadata).map(([key, value]) => (
//                       <div key={key}>
//                         <strong className="capitalize">{key}:</strong> {value}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Results Summary */}
//         {suggestions.length > 0 && (
//           <div className="bg-white rounded-lg shadow p-6">
//             <h3 className="font-semibold text-gray-900 mb-4">
//               Found {suggestions.length} results
//             </h3>
//             <div className="space-y-2">
//               {suggestions.map((result) => (
//                 <div
//                   key={result.id}
//                   className="flex items-center justify-between p-3 hover:bg-gray-50 rounded cursor-pointer"
//                   onClick={() => handleSuggestionSelect(result)}
//                 >
//                   <div>
//                     <p className="font-medium text-gray-900">{result.title}</p>
//                     <p className="text-sm text-gray-500">{result.type}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ============================================
// // INTEGRATION EXAMPLE - In Your Page
// // ============================================
// export default function SearchPageIntegration() {
//   return (
//     <div className="min-h-screen bg-white">
//       <header className="bg-indigo-600 text-white p-4">
//         <div className="max-w-6xl mx-auto">
//           <h1 className="text-2xl font-bold mb-4">Uni Archive</h1>
//           <div className="max-w-xl">
//             <AdvancedSearchPageExample />
//           </div>
//         </div>
//       </header>
//     </div>
//   );
// }