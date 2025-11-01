// import Image from "next/image";
"use client";

import {
  BLOG_DATA,
  BlogPost,
  USERS_DATA,
  User,
  mockCategories,
  mockCourses,
} from "@/assets/data/blogData";
import {
  updateBanners,
  welcomeBanners,
  featuredCourseBanners,
} from "@/assets/data/blogData";
import { getImageByID } from "@/assets/data/imagesData";
import { Banner3, Banner4 } from "@/components/banner/banneritem";
import { BannerCarousel, ScaleUp } from "@/components/banner/bannersection";
import DynamicSection from "@/components/reuse/dynamicsection";

export default function Home() {
  const teachers = USERS_DATA.filter((user) => user.role === "teacher");

  
  return (
    <div className="flex flex-col justify-center items-center w-[100vw] h-full p-2">
      
      <BannerCarousel
        data={[updateBanners, welcomeBanners, featuredCourseBanners]}
        autoRotate={true}
        autoRotateInterval={5000}
        duration={0.6}
        className="w-full"
      >
        {(banner) => <Banner4 data={banner} />}
      </BannerCarousel>

      {/* Intro To Uni-Archive */}
      <div className="intro-sect flex flex-col bg-gray-300 w-full h-full items-center justify-center py-4 px-3 rounded-md">
        <span className="flex text-2xl font-bold w-full pb-3">
          Welcome to Uni-Archive
        </span>
        <span className="space-y-4 text-base font-[500]">
          {" "}
          Your centralized hub for accessing, sharing, and archiving university
          past questions, lecture notes, handouts, and academic resources. Lorem
          ipsum dolor sit amet consectetur adipisicing elit. Sequi hic possimus,
          voluptate facere nam voluptatem provident ratione ipsam nostrum,
          explicabo architecto ducimus! Quasi quaerat tempora vel possimus eaque
          voluptatem sit fuga, quos laudantium eius aliquid sunt numquam,
          soluta, placeat velit consequatur reprehenderit amet ex dolorum
          doloribus eveniet alias dolores eligendi. Cupiditate eum molestias
          odio, molestiae error saepe alias minus, facilis esse, unde ducimus
          consectetur et tempore. Blanditiis ut ea velit!
        </span>
      </div>

      {/* Registered Universities */}
      <div className="topic-sect flex flex-col w-full h-full items-center justify-center py-4 px-3 rounded-md gap-3">
        <span className="flex w-full text-2xl font-bold">Trending Topics</span>
        <ScaleUp duration={0.5} delay={1} className="py-3">
          <Banner3 data={featuredCourseBanners} />
        </ScaleUp>
      </div>

      {/* Blogs Section */}
      <div className="blog-sect flex flex-col w-full h-full items-center justify-center rounded-md px-3">
        <DynamicSection<BlogPost>
          title="Latest Blog Posts"
          subtitle="Read our latest articles and tutorials"
          items={BLOG_DATA}
          sectionType="blog"
          layout="grid"
          mapper={(post) => {
            const firstImageId = post.imageIds[0];
            const imageAsset = firstImageId
              ? getImageByID(firstImageId)
              : undefined;
              
            return {
              id: String(post.id),
              title: post.title,
              subtitle: `By ${post.author} • ${post.date}`,
              description: post.excerpt,
              imageId: firstImageId, 
              image: imageAsset?.src,
              metadata: {
                likes: post.likes,
                comments: post.comments,
                shares: post.shares,
                date: post.date,
                tags: post.tags,
              },
            };
          }}
          onItemClick={(post) => console.log("View post:", post.title)}
          onViewAll={() => console.log("View all blogs")}
        />
      </div>

      <div className="instructors flex flex-col w-full h-full items-center justify-center rounded-md px-3">
        <DynamicSection<User>
          title="Top Instructors"
          subtitle="Learn from our experienced educators"
          items={teachers}
          sectionType="instructor"
          layout="grid"
          mapper={(user) => {
            const firstImageId = user.avatarId;
            const imageAsset = firstImageId
              ? getImageByID(firstImageId)
              : undefined;

            return {
              id: String(user.id),
              title: user.displayName,
              subtitle: user.role.charAt(0).toUpperCase() + user.role.slice(1),
              description: user.bio,
              imageId: firstImageId, 
              image: imageAsset?.src,
              metadata: {
                username: user.username,
                joinDate: user.joinDate,
                isOnline: user.isOnline,
                role: user.role,
              },
            };
          }}
          onItemClick={(user) => console.log("View profile:", user.displayName)}
          onViewAll={() => console.log("View all instructors")}
        />
      </div>

      <div className="popular-courses flex flex-col h-full items-center justify-center rounded-md px-3 w-[95vw]">
        <DynamicSection
          title="Popular Courses"
          subtitle="Start learning today"
          items={mockCourses}
          sectionType="course"
          layout="horizontal-scroll"
          autoScroll={true}
          className="flex flex-col w-full overflow-hidden rounded-lg"
          autoScrollInterval={3000}
          initialDisplayCount={6}
          maxDisplayCount={10}
          onItemClick={(course) => console.log("Enroll in:", course.title)}
          onViewAll={() => console.log("View all courses")}
        />
      </div>

      <div className="categories-sect flex flex-col w-full h-full items-center justify-center rounded-md px-3">
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
      </div>

      
    </div>
  );
}
