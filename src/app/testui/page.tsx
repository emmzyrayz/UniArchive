"use client";

import { fullActivities } from "@/assets/data/dummy";
import { Button, Card } from "@/components/UI";
import { ActivityFeed, BookmarkButton, Breadcrumbs, FeaturedContent, TopContent } from "@/components/reuse";
import router from "next/router";
import { useState } from "react";
import DynamicSection from "@/components/reuse/dynamicsection";
import { BLOG_DATA, USERS_DATA, BlogPost, User } from "@/assets/data/blogData";
import {
  mockCourses,
  mockInstructors,
  mockCategories,
} from "@/assets/data/dummy";
import Image from "next/image";


export default function Test() {
  const [selectedCourse, setSelectedCourse] = useState<unknown>(null);
  const teachers = USERS_DATA.filter((user) => user.role === "teacher");
  const featuredBlogs = BLOG_DATA.slice(0, 3);
  const activeUsers = USERS_DATA.filter((user) => user.isOnline);
  const students = USERS_DATA.filter((user) => user.role === "student");



  const activities = [
    {
      id: "1",
      type: "enrollment" as const,
      user: {
        name: "John Doe",
        avatar: "/john.jpg",
      },
      title: "Enrolled in Introduction to Algorithms",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      type: "completion" as const,
      user: {
        name: "Jane Smith",
        avatar: "/jane.jpg",
      },
      title: "Completed Data Structures Course",
      description: "Scored 95% on the final exam",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      metadata: {
        points: 500,
        course: "CS 201",
      },
    },
  ];

  function handleToggle(
    itemId: string,
    bookmarked: boolean
  ): void | Promise<void> {
    throw new Error("Function not implemented.");
  }

    const featuredCourses = [
      {
        id: "1",
        name: "React Pro",
        description: "Advanced React patterns and optimization",
      },
      {
        id: "2",
        name: "Web Performance",
        description: "Optimize your web applications",
      },
      {
        id: "3",
        name: "API Design",
        description: "RESTful and GraphQL APIs",
      },
    ];

    const trendingTopics = [
      {
        id: "ai",
        name: "AI & ML",
        description: "Machine learning fundamentals",
      },
      {
        id: "cloud",
        name: "Cloud Computing",
        description: "AWS, Azure, GCP",
      },
      {
        id: "devops",
        name: "DevOps",
        description: "CI/CD and containerization",
      },
    ];

  return (
    <div>
      <div className="activity flex flex-col py-3 px-4">
        <span className="text-2xl font-bold underline">Activity Feed</span>
        <ActivityFeed activities={activities} />

        <ActivityFeed
          activities={fullActivities}
          title="Recent Activity"
          maxItems={5}
          showViewAll
          onViewAll={() => router.push("/activity")}
          onItemClick={(activity) => console.log("Clicked:", activity)}
        />
      </div>

      <div className="bookmark flex flex-col py-3 px-4">
        <span className="text-2xl font-bold underline">Bookmark Button</span>
        <BookmarkButton
          itemId="material-123"
          isBookmarked={false}
          onToggle={handleToggle}
          size="md"
        />
        2. With Label tsx
        <BookmarkButton
          itemId="material-123"
          isBookmarked={true}
          onToggle={handleToggle}
          size="md"
          variant="button"
          showLabel
        />
        3. With Count tsx
        <BookmarkButton
          itemId="material-123"
          isBookmarked={false}
          onToggle={handleToggle}
          showCount
          count={24}
          variant="button"
          showLabel
        />
      </div>

      <div className="breadcrumb flex flex-col py-3 px-4 gap-3">
        <span className="text-2xl font-bold underline">Bread Crumbs</span>
        <Breadcrumbs
          showHome
          items={[
            { label: "Courses", href: "/courses" },
            { label: "Computer Science", href: "/courses/cs" },
            { label: "CS 301" },
          ]}
        />
        <Breadcrumbs
          items={[
            { label: "Dashboard", onClick: () => router.push("/dashboard") },
            { label: "Materials", onClick: () => router.push("/materials") },
            { label: "Current Material" },
          ]}
        />
        <Breadcrumbs
          maxItems={4}
          items={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: "Computer Science", href: "/courses/cs" },
            { label: "Level 300", href: "/courses/cs/300" },
            { label: "Semester 1", href: "/courses/cs/300/sem1" },
            { label: "CS 301", href: "/courses/cs/300/sem1/cs301" },
            { label: "Algorithms" },
          ]}
        />
      </div>

      <div className="featured flex flex-col py-3 px-4">
        <span className="text-2xl font-bold underline">Featured Contents</span>
        <div className="py-8">
          <FeaturedContent
            title="Featured Courses"
            subtitle="Handpicked by our instructors"
            items={featuredCourses}
            onItemClick={(course) => setSelectedCourse(course)}
            onViewAll={() => console.log("View all courses")}
          />
        </div>

        {/* Trending Topics */}
        {/* <div className="py-8 border-t border-gray-200">
          <FeaturedContent
            title="Trending Topics"
            subtitle="What developers are learning right now"
            items={trendingTopics}
            maxItems={3}
            onViewAll={() => console.log("View all trending")}
          />
        </div> */}

        {/* Selected Course Details */}
        {/* {selectedCourse && (
          <div className="py-8 border-t border-gray-200">
            <Card
              variant="elevated"
              header={
                <h2 className="text-2xl font-bold">{selectedCourse.name}</h2>
              }
            >
              <p className="text-gray-600 mb-4">{selectedCourse.description}</p>
              <div className="flex gap-2">
                <Button label="Enroll Now" variant="primary" />
                <Button label="Learn More" variant="outline" />
              </div>
            </Card>
          </div>
        )} */}

        <span>Top COntent</span>
        <TopContent
          title="Introduction to Algorithms"
          subtitle="CS 301 - Fall 2024"
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Courses", href: "/courses" },
                { label: "Computer Science", href: "/courses/cs" },
                { label: "CS 301" },
              ]}
            />
          }
        />
      </div>

      <DynamicSection<BlogPost>
        title="Latest Blog Posts"
        subtitle="Read our latest articles and tutorials"
        items={BLOG_DATA}
        sectionType="blog"
        layout="grid"
        mapper={(post) => ({
          id: String(post.id),
          title: post.title,
          subtitle: `By ${post.author} • ${post.date}`,
          description: post.excerpt,
          image: post.images[0],
          metadata: {
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            date: post.date,
            tags: post.tags,
          },
        })}
        onItemClick={(post) => console.log("View post:", post.title)}
        onViewAll={() => console.log("View all blogs")}
      />

      <DynamicSection<User>
        title="Top Instructors"
        subtitle="Learn from our experienced educators"
        items={teachers}
        sectionType="instructor"
        layout="grid"
        mapper={(user) => ({
          id: String(user.id),
          title: user.displayName,
          subtitle: user.role.charAt(0).toUpperCase() + user.role.slice(1),
          description: user.bio,
          // image: user.avatarId,
          metadata: {
            username: user.username,
            joinDate: user.joinDate,
            isOnline: user.isOnline,
            role: user.role,
          },
        })}
        onItemClick={(user) => console.log("View profile:", user.displayName)}
        onViewAll={() => console.log("View all instructors")}
      />

      <DynamicSection
        title="Popular Courses"
        subtitle="Start learning today"
        items={mockCourses}
        sectionType="course"
        layout="scroll"
        autoScroll={true}
        autoScrollInterval={3000}
        initialDisplayCount={6}
        maxDisplayCount={10}
        onItemClick={(course) => console.log("Enroll in:", course.title)}
        onViewAll={() => console.log("View all courses")}
      />

      <DynamicSection
        title="Browse Categories"
        subtitle="Explore topics that interest you"
        items={mockCategories}
        sectionType="category"
        layout="grid"
        onItemClick={(category) =>
          console.log("View category:", category.title)
        }
        onViewAll={() => console.log("View all categories")}
      />

      <DynamicSection<User>
        title="Active Users"
        subtitle="Currently online"
        items={activeUsers}
        sectionType="user"
        layout="scroll"
        autoScroll={true}
        autoScrollInterval={2500}
        initialDisplayCount={4}
        maxDisplayCount={6}
        mapper={(user) => ({
          id: String(user.id),
          title: user.displayName,
          subtitle: `@${user.username}`,
          description: user.bio,
          // image: user.avatarId,
          metadata: {
            role: user.role,
            isOnline: user.isOnline,
          },
        })}
        onItemClick={(user) => console.log("Chat with:", user.displayName)}
      />

      <DynamicSection<BlogPost>
        title="Featured Articles"
        subtitle="Hand-picked by our editorial team"
        items={featuredBlogs}
        layout="grid"
        renderItem={(post) => (
          <div
            key={post.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => console.log("Read:", post.title)}
          >
            {post.images[0] && (
              <div className="h-48 bg-gradient-to-br from-purple-500 to-pink-500">
                <Image
                  src={post.images[0]}
                  alt={post.title}
                  width={300}
                  height={500}
                  className="w-full h-full object-cover opacity-80"
                />
              </div>
            )}
            <div className="p-5">
              <div className="flex flex-wrap gap-2 mb-3">
                {post.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                {post.title}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{post.author}</span>
                <span>❤️ {post.likes}</span>
              </div>
            </div>
          </div>
        )}
        onViewAll={() => console.log("View all featured")}
      />

      <DynamicSection<User>
        title="Top Contributors"
        subtitle="Most active community members this week"
        items={students}
        sectionType="user"
        layout="grid"
        mapper={(user) => ({
          id: String(user.id),
          title: user.displayName,
          subtitle: "Student",
          description: user.bio || "Active community member",
          // image: user.avatarId,
          metadata: {
            username: user.username,
            role: user.role,
            joinDate: user.joinDate,
          },
        })}
        onItemClick={(user) =>
          console.log("View contributions:", user.displayName)
        }
        onViewAll={() => console.log("View all contributors")}
      />
    </div>
  );
}
