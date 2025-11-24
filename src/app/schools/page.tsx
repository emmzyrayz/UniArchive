"use client";

import { useState, useEffect } from "react";
import RatingStars from "@/utils/ratingrender";
import Link from "next/link";
import Image from "next/image";


import {mockSchools, School } from "@/assets/data/school"

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    // In a real application, you would fetch this data from your API
    const fetchSchools = async () => {
      try {
        // Simulating API call with mock data
        // Replace this with your actual API call
        setTimeout(() => {
          setSchools(mockSchools);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching schools:", error);
        setIsLoading(false);
      }
    };

    fetchSchools();
  }, []);

  // Filter schools based on search term and category
  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.location.toLowerCase().includes(searchTerm.toLowerCase());

    if (category === "all") return matchesSearch;
    else if (category === "top-rated") return matchesSearch && school.isTopRated;
    else if (category === "trending") return matchesSearch && school.isTrending;
    else if (category === "featured") return matchesSearch && school.isFeatured;
    else if (category === "best-environment") return matchesSearch && school.bestEnvironment;
    else if (category === "affordable") return matchesSearch && school.isAffordable;
    else if (category === "low-cutoff") return matchesSearch && school.lowCutOff;
    
    return matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-8 pt-[70px]">
      <h1 className="text-3xl font-bold mb-8 text-center">Schools Directory</h1>

      {/* Search and Filters section */}
      <div className="mb-8">
        <div className="relative max-w-md mx-auto mb-6">
          <input
            type="text"
            placeholder="Search schools by name or location..."
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:border-black/70"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-3 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            All Schools
          </button>
          <button
            onClick={() => setCategory("top-rated")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === "top-rated"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Top Rated
          </button>
          <button
            onClick={() => setCategory("trending")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === "trending"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setCategory("featured")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === "featured"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Featured
          </button>
          <button
            onClick={() => setCategory("best-environment")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === "best-environment"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Best Environment
          </button>
          <button
            onClick={() => setCategory("affordable")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === "affordable"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Most Affordable
          </button>
          <button
            onClick={() => setCategory("low-cutoff")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === "low-cutoff"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Low Cut-off
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Display category headers */}
          {category === "all" && (
            <>
              {/* Top Rated Schools */}
              {schools.some(school => school.isTopRated) && (
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold mb-6 border-l-4 border-blue-600 pl-3">Top Rated Schools</h2>
                  <div className="flex flex-wrap -mx-4">
                    {schools
                      .filter(school => school.isTopRated)
                      .map((school) => (
                        <SchoolCard key={school.id} school={school} />
                      ))}
                  </div>
                </div>
              )}

              {/* Trending Schools */}
              {schools.some(school => school.isTrending) && (
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold mb-6 border-l-4 border-pink-500 pl-3">Trending Schools</h2>
                  <div className="flex flex-wrap -mx-4">
                    {schools
                      .filter(school => school.isTrending)
                      .map((school) => (
                        <SchoolCard key={school.id} school={school} />
                      ))}
                  </div>
                </div>
              )}

              {/* Featured Schools */}
              {schools.some(school => school.isFeatured) && (
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold mb-6 border-l-4 border-purple-500 pl-3">Featured Schools</h2>
                  <div className="flex flex-wrap -mx-4">
                    {schools
                      .filter(school => school.isFeatured)
                      .map((school) => (
                        <SchoolCard key={school.id} school={school} />
                      ))}
                  </div>
                </div>
              )}

              {/* Best Environment Schools */}
              {schools.some(school => school.bestEnvironment) && (
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold mb-6 border-l-4 border-green-500 pl-3">Schools with Best Living & Study Environment</h2>
                  <div className="flex flex-wrap -mx-4">
                    {schools
                      .filter(school => school.bestEnvironment)
                      .map((school) => (
                        <SchoolCard key={school.id} school={school} />
                      ))}
                  </div>
                </div>
              )}

              {/* Most Affordable Schools */}
              {schools.some(school => school.isAffordable) && (
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold mb-6 border-l-4 border-yellow-500 pl-3">Most Affordable Schools</h2>
                  <div className="flex flex-wrap -mx-4">
                    {schools
                      .filter(school => school.isAffordable)
                      .map((school) => (
                        <SchoolCard key={school.id} school={school} />
                      ))}
                  </div>
                </div>
              )}

              {/* Low Cut-off Schools */}
              {schools.some(school => school.lowCutOff) && (
                <div className="mb-10">
                  <h2 className="text-2xl font-semibold mb-6 border-l-4 border-orange-500 pl-3">Schools with Low Cut-off Marks</h2>
                  <div className="flex flex-wrap -mx-4">
                    {schools
                      .filter(school => school.lowCutOff)
                      .map((school) => (
                        <SchoolCard key={school.id} school={school} />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Display filtered schools */}
          {(category !== "all" || (category === "all" && !schools.some(school => 
            school.isTopRated || school.isTrending || school.isFeatured || 
            school.bestEnvironment || school.isAffordable || school.lowCutOff))) && (
            <div className="flex flex-wrap -mx-4">
              {filteredSchools.length > 0 ? (
                filteredSchools.map((school) => (
                  <SchoolCard key={school.id} school={school} />
                ))
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-xl text-gray-600">
                    No schools found matching your search.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// School Card Component
function SchoolCard({ school }: { school: School }) {
  // Function to determine the badge text and color
  const getBadge = () => {
    if (school.isTopRated) return { text: "Top Rated", color: "bg-blue-100 text-blue-800" };
    if (school.isTrending) return { text: "Trending", color: "bg-pink-100 text-pink-800" };
    if (school.isFeatured) return { text: "Featured", color: "bg-purple-100 text-purple-800" };
    if (school.bestEnvironment) return { text: "Best Environment", color: "bg-green-100 text-green-800" };
    if (school.isAffordable) return { text: "Affordable", color: "bg-yellow-100 text-yellow-800" };
    if (school.lowCutOff) return { text: "Low Cut-off", color: "bg-orange-100 text-orange-800" };
    return null;
  };

  const badge = getBadge();

  return (
    <div className="w-full md:w-1/2 lg:w-1/3 px-4 mb-8">
      <Link href={`/schools/${school.id}`}>
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
          <div className="relative h-48">
            <Image
              src={school.mainImage}
              alt={school.name}
              fill
              className="object-cover"
            />
            {badge && (
              <div className={`absolute top-4 right-4 ${badge.color} px-2 py-1 rounded-full text-xs font-medium`}>
                {badge.text}
              </div>
            )}
          </div>
          <div className="p-6 flex-grow">
            <h2 className="text-xl font-semibold mb-2">{school.name}</h2>
            <p className="text-gray-600 mb-2">
              <span className="inline-block mr-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 inline"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </span>
              {school.location}
            </p>
            <div className="flex items-center mb-3">
              <span className="text-sm mr-1 text-gray-600">Rating: </span>
              <div className="flex">
                <RatingStars rating={school.rating} size={16} color="#000" />
              </div>
            </div>
            <p className="text-gray-700 mb-4 line-clamp-3">{school.description}</p>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Students: {school.studentCount.toLocaleString()}</span>
              <span>Est. {school.founded}</span>
            </div>
            {/* Additional info based on category badges */}
            <div className="mt-3 text-sm">
              {school.tuitionFee && (
                <p className="text-gray-600">
                  <span className="font-medium">Tuition:</span> ${school.tuitionFee.toLocaleString()}/year
                </p>
              )}
              {school.livingIndex && (
                <p className="text-gray-600">
                  <span className="font-medium">Living Index:</span> {school.livingIndex}/100
                </p>
              )}
              {school.cutOffScore && (
                <p className="text-gray-600">
                  <span className="font-medium">Cut-off Score:</span> {school.cutOffScore}/100
                </p>
              )}
            </div>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <span className="text-blue-600 font-medium">View Details →</span>
          </div>
        </div>
      </Link>
    </div>
  );
}