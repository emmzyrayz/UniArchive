'use client'

import React from "react";
import {useState} from "react";
import Link from "next/link"
import {
  // LuBell,
  LuBookOpen,
  LuFileText,
  LuUpload,
  LuChevronRight,
  LuAward,
  // LuBook,
  LuBookmark,
  LuSearch,
} from "react-icons/lu";

import Image from 'next/image';
import {StaticImageData} from "next/image";

// Images
import Lego from "@/assets/img/gallery/lego.jpg";
import Leica from "@/assets/img/gallery/leica.jpg";
// import Nashville from "@/assets/img/gallery/nashville.jpg";
import surf from "@/assets/img/gallery/surf.jpg";
import Post from "@/assets/img/post/post_5.png";
import Blog from "@/assets/img/people/gallery/g5.jpg";
import Post1 from "@/assets/img/post/post_9.png";
import RedBull from "@/assets/img/gallery/red-bull.jpg";

// avatars
// import Ava1 from "@/assets/img/people/avatar/comment_1.png";
// import Ava2 from "@/assets/img/people/avatar/comment_2.png";
import Ava3 from "@/assets/img/people/avatar/comment_3.png";
// import Ava4 from "@/assets/img/people/avatar/author.png";

interface Course {
  id: string;
  title: string;
  progress: number;
  image: string | StaticImageData;
  department: string;
}

interface Material {
  id: string;
  title: string;
  type: string;
  date: string;
  university: string;
  department: string;
}

interface University {
  id: string;
  name: string;
  logo: string | StaticImageData;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isImportant: boolean;
}

interface UserStats {
  downloads: number;
  contributions: number;
  coursesFollowed: number;
  rank: string;
}

// Mock data
const mockUser = {
  name: "Emmanuel",
  avatar: Ava3,
  email: "emmanuel@example.edu",
  university: "Lagos State University",
  department: "Computer Science",
};

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Advanced Database Systems",
    progress: 67,
    image: Post,
    department: "Computer Science",
  },
  {
    id: "2",
    title: "Software Engineering Principles",
    progress: 42,
    image: Lego,
    department: "Computer Science",
  },
  {
    id: "3",
    title: "Data Structures and Algorithms",
    progress: 89,
    image: Leica,
    department: "Computer Science",
  },
];

const mockMaterials: Material[] = [
  {
    id: "1",
    title: "Database Systems Past Questions 2024",
    type: "PDF",
    date: "2 days ago",
    university: "Lagos State University",
    department: "Computer Science",
  },
  {
    id: "2",
    title: "Software Engineering Lecture Notes",
    type: "PDF",
    date: "5 days ago",
    university: "Lagos State University",
    department: "Computer Science",
  },
  {
    id: "3",
    title: "Data Structures Final Exam Study Guide",
    type: "PDF",
    date: "1 week ago",
    university: "Lagos State University",
    department: "Computer Science",
  },
];

const mockUniversities: University[] = [
  {id: "1", name: "Lagos State University", logo: Blog},
  {id: "2", name: "University of Lagos", logo: surf},
  {
    id: "3",
    name: "Federal University of Technology",
    logo: Post1,
  },
  {id: "4", name: "Ahmadu Bello University", logo: RedBull},
];

const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Platform Maintenance",
    content:
      "The platform will be under maintenance on Sunday from 2AM to 4AM.",
    date: "May 2, 2025",
    isImportant: true,
  },
  {
    id: "2",
    title: "New Feature: Study Groups",
    content: "You can now create and join study groups with classmates.",
    date: "April 29, 2025",
    isImportant: false,
  },
];

const mockUserStats: UserStats = {
  downloads: 47,
  contributions: 12,
  coursesFollowed: 8,
  rank: "Bronze Contributor",
};

export default function Dashboardpage() {
  const [savedMaterials, setSavedMaterials] = useState<string[]>([]);

  const toggleSave = (id: string) => {
    if (savedMaterials.includes(id)) {
      setSavedMaterials(
        savedMaterials.filter((materialId) => materialId !== id)
      );
    } else {
      setSavedMaterials([...savedMaterials, id]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-[50px]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner / Quick Actions */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <div>
                <h2 className="text-[16px] xl:text-[18px] font-bold text-gray-900">
                  Welcome back, {mockUser.name}!
                </h2>
                <p className="mt-1 text-[14px] xl:text-[16px] text-gray-500">
                  {mockUser.university} • {mockUser.department}
                </p>
              </div>
              <div className="mt-4 md:-mr-4 md:w-2/3 md:mt-0 flex flex-col md:flex-row gap-2 xl:gap-3 items-center">
                <button className="bg-blue-600 hover:bg-blue-700 rounded-md text-white p-2 xl:p-4 text-[14px] xl:text-[16px] font-medium flex items-center w-full cursor-pointer">
                  <LuBookOpen size={16} className="mr-2" />
                  Continue Learning
                </button>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md p-2 xl:p-2 text-[14px] xl:text-[16px] font-medium flex items-center w-full cursor-pointer">
                  <LuUpload size={16} className="mr-2" />
                  Upload Material
                </button>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md p-2 xl:p-2 text-[14px] xl:text-[16px] font-medium flex items-center w-full cursor-pointer">
                  <LuSearch size={16} className="mr-2" />
                  Browse Materials
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Continue Learning Section */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Continue Learning
                </h3>
                <a
                  href="#"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
                >
                  See all <LuChevronRight size={16} />
                </a>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockCourses.map((course) => (
                      <div
                        key={course.id}
                        className="border flex flex-col items-center justify-between border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow"
                      >
                        <Image
                          src={course.image}
                          alt={course.title}
                          className="w-full h-36 object-cover"
                          width={300}
                          height={500}
                        />
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900">
                            {course.title}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {course.department}
                          </p>
                          <div className="mt-2">
                            <div className="relative pt-1">
                              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                <div
                                  style={{width: `${course.progress}%`}}
                                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {course.progress}% complete
                              </p>
                            </div>
                          </div>
                          <button className="mt-3 w-full bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-sm font-medium cursor-pointer">
                            Resume Course
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Latest Uploads Section */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Latest Uploads
                </h3>
                <a
                  href="#"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
                >
                  See all <LuChevronRight size={16} />
                </a>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-4">
                    {mockMaterials.map((material) => (
                      <div
                        key={material.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <LuFileText
                                  size={20}
                                  className="text-blue-600"
                                />
                              </div>
                            </div>
                            <div className="ml-4">
                              <h4 className="text-sm font-medium text-gray-900">
                                {material.title}
                              </h4>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <span>{material.type}</span>
                                <span className="mx-2">•</span>
                                <span>{material.department}</span>
                                <span className="mx-2">•</span>
                                <span>Added {material.date}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleSave(material.id)}
                            className="flex-shrink-0 text-gray-400 hover:text-blue-600 focus:outline-none cursor-pointer"
                          >
                            <LuBookmark
                              size={18}
                              className={
                                savedMaterials.includes(material.id)
                                  ? "fill-blue-600 text-blue-600"
                                  : ""
                              }
                            />
                          </button>
                        </div>
                        <div className="mt-3 flex justify-between">
                          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium cursor-pointer">
                            Download
                          </button>
                          <button className="text-sm text-gray-500 hover:text-gray-700 font-medium cursor-pointer">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            {/* User Stats Overview */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Your Stats
                </h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-row flex-wrap items-center justify-center gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg flex flex-col w-[150px] items-center justify-center">
                      <div className="font-bold text-2xl text-blue-600">
                        {mockUserStats.downloads}
                      </div>
                      <div className="text-sm text-gray-500">Downloads</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg flex flex-col w-[150px] items-center justify-center">
                      <div className="font-bold text-2xl text-green-600">
                        {mockUserStats.contributions}
                      </div>
                      <div className="text-sm text-gray-500">Contributions</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg flex flex-col w-[150px] items-center justify-center">
                      <div className="font-bold text-2xl text-purple-600">
                        {mockUserStats.coursesFollowed}
                      </div>
                      <div className="text-sm text-gray-500">Courses</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg flex flex-col w-[150px] items-center justify-center">
                      <LuAward size={24} className="text-yellow-500 mr-2" />
                      <div className="text-sm text-gray-700 flex flex-col w-[150px] items-center justify-center">
                        {mockUserStats.rank}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium cursor-pointer">
                      View Complete Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* University / Department Quick Links */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Universities
                </h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {mockUniversities.map((university) => (
                      <a
                        key={university.id}
                        href="#"
                        className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Image
                          src={university.logo}
                          alt={university.name}
                          className="w-10 h-10 object-contain"
                          width={300}
                          height={500}
                        />
                        <span className="mt-2 text-xs text-center text-gray-600">
                          {university.name}
                        </span>
                      </a>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium">
                      Browse All Universities
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Announcements / News */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Announcements
                </h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-4">
                    {mockAnnouncements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`p-3 rounded-lg ${
                          announcement.isImportant
                            ? "bg-red-50 border border-red-100"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="font-medium text-sm">
                          {announcement.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {announcement.content}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {announcement.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contribution Prompt */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium">
                  Contribute to the Community
                </h3>
                <div className="mt-2 text-sm text-blue-100">
                  Share your notes, past questions, and other academic materials
                  with students in your university.
                </div>
                <div className="mt-4">
                  <Link
                    href="#"
                    className="flex items-center justify-center bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 cursor-pointer"
                  >
                    <button className="cursor-pointer bg-transparent">
                      Upload Materials
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};