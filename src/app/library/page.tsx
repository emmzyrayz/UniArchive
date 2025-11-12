"use client";

import React, { useState, useMemo } from "react";
import {
  LuSearch,
  LuFilter,
  LuBookOpen,
  LuVideo,
  LuHeadphones,
  LuSlidersHorizontal,
  LuFileText,
  LuNewspaper,
  LuMessageSquare,
} from "react-icons/lu";
import Image from "next/image";
import Link from "next/link";
import {
  BLOG_DATA,
  USERS_DATA,
  getBlogImages,
  type BlogType,
} from "@/assets/data/blogData";

// Extended types for library
type ContentType = BlogType | "all";
type ContentCategory = "all" | "material" | "blog" | "post";
type SortOption = "recent" | "popular" | "title" | "oldest";

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ContentType>("all");
  const [selectedContentCategory, setSelectedContentCategory] =
    useState<ContentCategory>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Extract unique values for filters from blog data
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(BLOG_DATA.flatMap((post) => post.tags))
    );
    return ["all", ...uniqueCategories];
  }, []);

  const years = useMemo(() => {
    const uniqueYears = Array.from(
      new Set(
        BLOG_DATA.map((post) => new Date(post.date).getFullYear().toString())
      )
    );
    return ["all", ...uniqueYears.sort().reverse()];
  }, []);

  // Determine content category based on some criteria
  // You can adjust this logic based on how you want to categorize your content
  const getContentCategory = (
    post: (typeof BLOG_DATA)[0]
  ): "material" | "blog" | "post" => {
    // Example logic - customize based on your needs:
    // Materials: platform type with specific tags
    if (
      post.type === "platform" &&
      post.tags.some((tag) =>
        ["Web Development", "Programming", "TypeScript"].includes(tag)
      )
    ) {
      return "material";
    }
    // Blogs: longer content or specific tags
    if (post.content.length > 500 || post.tags.includes("Technology")) {
      return "blog";
    }
    // Posts: everything else
    return "post";
  };

  // Filter and sort logic
  const filteredAndSortedData = useMemo(() => {
    const filtered = BLOG_DATA.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === "all" || post.type === selectedType;

      const matchesCategory =
        selectedCategory === "all" ||
        post.tags.some((tag) => tag === selectedCategory);

      const postYear = new Date(post.date).getFullYear().toString();
      const matchesYear = selectedYear === "all" || postYear === selectedYear;

      const contentCategory = getContentCategory(post);
      const matchesContentCategory =
        selectedContentCategory === "all" ||
        contentCategory === selectedContentCategory;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesYear &&
        matchesContentCategory
      );
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "popular":
          return b.likes - a.likes;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    searchQuery,
    selectedType,
    selectedContentCategory,
    selectedCategory,
    selectedYear,
    sortBy,
  ]);

  // Count items per category
  const categoryCounts = useMemo(() => {
    return {
      all: BLOG_DATA.length,
      material: BLOG_DATA.filter((p) => getContentCategory(p) === "material")
        .length,
      blog: BLOG_DATA.filter((p) => getContentCategory(p) === "blog").length,
      post: BLOG_DATA.filter((p) => getContentCategory(p) === "post").length,
    };
  }, []);

  const getTypeIcon = (type: BlogType) => {
    switch (type) {
      case "platform":
        return <LuBookOpen className="w-5 h-5" />;
      case "teacher":
        return <LuVideo className="w-5 h-5" />;
      case "student":
        return <LuHeadphones className="w-5 h-5" />;
      default:
        return <LuBookOpen className="w-5 h-5" />;
    }
  };

  const getCategoryIcon = (category: ContentCategory) => {
    switch (category) {
      case "material":
        return <LuFileText className="w-4 h-4" />;
      case "blog":
        return <LuNewspaper className="w-4 h-4" />;
      case "post":
        return <LuMessageSquare className="w-4 h-4" />;
      default:
        return <LuFilter className="w-4 h-4" />;
    }
  };

  const getActionButton = (type: BlogType) => {
    switch (type) {
      case "platform":
        return "Read";
      case "teacher":
        return "Watch";
      case "student":
        return "Listen";
      default:
        return "View";
    }
  };

  const getTypeLabel = (type: BlogType) => {
    switch (type) {
      case "platform":
        return "Text";
      case "teacher":
        return "Video";
      case "student":
        return "Audio";
      default:
        return type;
    }
  };

  const getTypeColor = (type: BlogType) => {
    switch (type) {
      case "platform":
        return {
          gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
          badge: "bg-blue-100 text-blue-700",
        };
      case "teacher":
        return {
          gradient: "bg-gradient-to-br from-purple-500 to-purple-600",
          badge: "bg-purple-100 text-purple-700",
        };
      case "student":
        return {
          gradient: "bg-gradient-to-br from-green-500 to-green-600",
          badge: "bg-green-100 text-green-700",
        };
      default:
        return {
          gradient: "bg-gradient-to-br from-gray-500 to-gray-600",
          badge: "bg-gray-100 text-gray-700",
        };
    }
  };

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedContentCategory("all");
    setSelectedCategory("all");
    setSelectedYear("all");
    setSearchQuery("");
  };

  const activeFiltersCount = [
    selectedType !== "all",
    selectedContentCategory !== "all",
    selectedCategory !== "all",
    selectedYear !== "all",
  ].filter(Boolean).length;

  // Get author info
  const getAuthorInfo = (authorId: number) => {
    return USERS_DATA.find((user) => user.id === authorId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Library
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {filteredAndSortedData.length} items available
              </p>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LuSlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search materials, blogs, posts, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Quick Category Tabs - Desktop */}
          <div className="hidden md:flex items-center gap-2 mt-4">
            {[
              { value: "all", label: "All", count: categoryCounts.all },
              {
                value: "material",
                label: "Materials",
                count: categoryCounts.material,
              },
              { value: "blog", label: "Blogs", count: categoryCounts.blog },
              { value: "post", label: "Posts", count: categoryCounts.post },
            ].map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() =>
                  setSelectedContentCategory(value as ContentCategory)
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedContentCategory === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {getCategoryIcon(value as ContentCategory)}
                {label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedContentCategory === value
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <aside
            className={`lg:w-64 flex-shrink-0 ${
              showMobileFilters ? "block" : "hidden lg:block"
            }`}
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <LuFilter className="w-4 h-4" />
                  Filters
                </h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {/* Content Category Filter - Mobile */}
                <div className="md:hidden">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                  </label>
                  <select
                    value={selectedContentCategory}
                    onChange={(e) =>
                      setSelectedContentCategory(
                        e.target.value as ContentCategory
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="all">All ({categoryCounts.all})</option>
                    <option value="material">
                      Materials ({categoryCounts.material})
                    </option>
                    <option value="blog">Blogs ({categoryCounts.blog})</option>
                    <option value="post">Posts ({categoryCounts.post})</option>
                  </select>
                </div>

                {/* Media Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Media Type
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "all", label: "All Types", icon: LuFilter },
                      { value: "platform", label: "Text", icon: LuBookOpen },
                      { value: "teacher", label: "Video", icon: LuVideo },
                      { value: "student", label: "Audio", icon: LuHeadphones },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedType(value as ContentType)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedType === value
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === "all" ? "All Subjects" : cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year === "all" ? "All Years" : year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            {/* Sort Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest</option>
                    <option value="popular">Most Popular</option>
                    <option value="title">Title (A-Z)</option>
                  </select>
                </div>

                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">
                    {filteredAndSortedData.length}
                  </span>{" "}
                  results
                </div>
              </div>
            </div>

            {/* Content Grid */}
            {filteredAndSortedData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAndSortedData.map((post) => {
                  const typeColors = getTypeColor(post.type);
                  const authorInfo = getAuthorInfo(post.authorId);
                  const postImages = getBlogImages(post.imageIds);
                  const firstImage =
                    postImages.length > 0 ? postImages[0] : null;
                  const contentCategory = getContentCategory(post);

                  return (
                    <Link href={`/materials/${post.id}`} key={post.id}>
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
                        {/* Card Thumbnail */}
                        <div
                          className={`h-40 relative overflow-hidden ${
                            !firstImage ? typeColors.gradient : ""
                          }`}
                        >
                          {firstImage ? (
                            <Image
                              src={firstImage.src}
                              alt={firstImage.alt}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <div className="text-white">
                                {getTypeIcon(post.type)}
                              </div>
                            </div>
                          )}
                          {/* Type overlay badge on image */}
                          {firstImage && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-lg">
                              {getTypeIcon(post.type)}
                            </div>
                          )}
                          {/* Content Category Badge */}
                          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                            {getCategoryIcon(contentCategory)}
                            {contentCategory.charAt(0).toUpperCase() +
                              contentCategory.slice(1)}
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4">
                          {/* Type Badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeColors.badge}`}
                            >
                              {getTypeIcon(post.type)}
                              {getTypeLabel(post.type)}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600">
                            {post.title}
                          </h3>

                          {/* Description */}
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {post.excerpt}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {post.tags.length > 2 && (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                +{post.tags.length - 2}
                              </span>
                            )}
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span className="font-medium">
                              {authorInfo?.displayName || post.author}
                            </span>
                            <span>{post.likes} likes</span>
                          </div>

                          {/* Date */}
                          <div className="text-xs text-gray-400 mb-3">
                            {formatDate(post.date)}
                          </div>

                          {/* Action Button */}
                          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                            {getActionButton(post.type)}
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <LuSearch className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No items found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or search query
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
