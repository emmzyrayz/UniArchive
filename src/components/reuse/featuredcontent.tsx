import { Card, Skeleton } from "@/components/UI";
import { ReactNode } from "react";

interface FeaturedItem {
  id: string;
  name: string;
  description?: string;
  icon?: ReactNode;
  href?: string;
}

interface FeaturedSectionProps {
  title: string;
  items: FeaturedItem[];
  onViewAll?: () => void;
  onItemClick?: (item: FeaturedItem) => void;
  subtitle?: string;
  emptyState?: ReactNode;
  maxItems?: number;
  isLoading?: boolean;
}

export default function FeaturedSection({
  title,
  items,
  onViewAll,
  onItemClick,
  subtitle,
  emptyState,
  maxItems,
  isLoading = false,
}: FeaturedSectionProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  // Loading state
  if (isLoading) {
    return (
      <section className="py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-black">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" animation="wave" rounded="md" className="h-32 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Empty state
  if (displayItems.length === 0) {
    return (
      <section className="py-10">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-black">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center justify-center min-h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          {emptyState || <p className="text-gray-500">No items available</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-black">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="px-4 py-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
            aria-label={`View all ${title}`}
          >
            View All
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayItems.map((item) => (
          <Card
            key={item.id}
            variant="elevated"
            className="text-center cursor-pointer transition-transform hover:scale-105"
            onClick={() => onItemClick?.(item)}
            hoverable
          >
            {item.icon && (
              <div className="text-5xl mb-3 flex justify-center">
                {item.icon}
              </div>
            )}
            <div className="text-3xl font-bold text-indigo-600">
              {item.name}
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {item.description}
              </p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}


// Usage Examples:
// import FeaturedSection from "@/components/FeaturedSection";
// import { Button, Card, Badge, Avatar, Skeleton } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Courses with Button Action
// export function CoursesWithButtons() {
//   const courses = [
//     {
//       id: "1",
//       name: "React Fundamentals",
//       description: "Learn React hooks, components, and state management",
//     },
//     {
//       id: "2",
//       name: "TypeScript Mastery",
//       description: "Master type-safe JavaScript development",
//     },
//     {
//       id: "3",
//       name: "Tailwind CSS",
//       description: "Rapid UI development with utility-first CSS",
//     },
//   ];

//   const handleCourseClick = (item: (typeof courses)[0]) => {
//     console.log("Navigating to:", item.name);
//   };

//   return (
//     <FeaturedSection
//       title="Featured Courses"
//       subtitle="Popular learning paths for developers"
//       items={courses}
//       onItemClick={handleCourseClick}
//       onViewAll={() => console.log("View all courses")}
//     />
//   );
// }

// // Example 2: With Icons and Complex Cards
// export function ResourcesWithIcons() {
//   const resources = [
//     {
//       id: "docs",
//       name: "📚",
//       description: "Comprehensive guides and API reference",
//     },
//     {
//       id: "tutorials",
//       name: "🎓",
//       description: "Step-by-step learning materials",
//     },
//     {
//       id: "tools",
//       name: "⚙️",
//       description: "Tools, templates, and code snippets",
//     },
//   ];

//   return (
//     <FeaturedSection
//       title="Learning Resources"
//       subtitle="Everything you need to get started"
//       items={resources}
//       onViewAll={() => console.log("View all resources")}
//     />
//   );
// }

// // Example 3: Loading State Integration
// export function CoursesWithLoadingState() {
//   const [isLoading, setIsLoading] = useState(true);
//   const [courses, setCourses] = useState<any[]>([]);

//   // Simulate data fetching
//   const loadCourses = () => {
//     setIsLoading(true);
//     setTimeout(() => {
//       setCourses([
//         {
//           id: "1",
//           name: "Advanced React",
//           description: "Deep dive into React",
//         },
//         {
//           id: "2",
//           name: "Node.js Backend",
//           description: "Build scalable APIs",
//         },
//         {
//           id: "3",
//           name: "Database Design",
//           description: "SQL and NoSQL patterns",
//         },
//       ]);
//       setIsLoading(false);
//     }, 2000);
//   };

//   return (
//     <div className="space-y-6">
//       <Button label="Load Courses" onClick={loadCourses} />
//       <FeaturedSection
//         title="Latest Courses"
//         items={courses}
//         isLoading={isLoading}
//         maxItems={3}
//         onViewAll={() => console.log("View all")}
//       />
//     </div>
//   );
// }

// // Example 4: Empty State with Custom Message
// export function SavedItemsSection() {
//   const [savedItems, setSavedItems] = useState<any[]>([]);

//   return (
//     <FeaturedSection
//       title="My Saved Items"
//       items={savedItems}
//       emptyState={
//         <div className="text-center">
//           <div className="text-3xl mb-2">📌</div>
//           <p className="text-gray-600 font-medium">No saved items yet</p>
//           <p className="text-sm text-gray-500 mt-1">
//             Save items to your collection to view them here
//           </p>
//         </div>
//       }
//     />
//   );
// }

// // Example 5: Instructors with Avatars
// export function FeaturedInstructors() {
//   const instructors = [
//     {
//       id: "1",
//       name: "John Doe",
//       description: "React and JavaScript Expert",
//       icon: <Avatar alt="John Doe" size="lg" />,
//     },
//     {
//       id: "2",
//       name: "Jane Smith",
//       description: "Full Stack Developer",
//       icon: <Avatar alt="Jane Smith" size="lg" />,
//     },
//     {
//       id: "3",
//       name: "Mike Johnson",
//       description: "UI/UX Designer",
//       icon: <Avatar alt="Mike Johnson" size="lg" />,
//     },
//   ];

//   return (
//     <FeaturedSection
//       title="Featured Instructors"
//       subtitle="Learn from industry experts"
//       items={instructors}
//       onItemClick={(item) => console.log("View profile:", item.name)}
//     />
//   );
// }

// // Example 6: Categories with Badges
// export function CategoriesWithBadges() {
//   const categories = [
//     {
//       id: "programming",
//       name: "Programming",
//       description: "500+ courses",
//     },
//     {
//       id: "design",
//       name: "Design",
//       description: "300+ courses",
//     },
//     {
//       id: "business",
//       name: "Business",
//       description: "250+ courses",
//     },
//   ];

//   return (
//     <FeaturedSection
//       title="Popular Categories"
//       items={categories}
//       onViewAll={() => console.log("View all categories")}
//     />
//   );
// }

// // Example 7: Complete Dashboard Page
// export default function EducationDashboard() {
//   const [selectedCourse, setSelectedCourse] = useState<any>(null);

//   const featuredCourses = [
//     {
//       id: "1",
//       name: "React Pro",
//       description: "Advanced React patterns and optimization",
//     },
//     {
//       id: "2",
//       name: "Web Performance",
//       description: "Optimize your web applications",
//     },
//     {
//       id: "3",
//       name: "API Design",
//       description: "RESTful and GraphQL APIs",
//     },
//   ];

//   const trendingTopics = [
//     {
//       id: "ai",
//       name: "AI & ML",
//       description: "Machine learning fundamentals",
//     },
//     {
//       id: "cloud",
//       name: "Cloud Computing",
//       description: "AWS, Azure, GCP",
//     },
//     {
//       id: "devops",
//       name: "DevOps",
//       description: "CI/CD and containerization",
//     },
//   ];

//   return (
//     <div className="bg-white min-h-screen">
//       <div className="max-w-6xl mx-auto px-4">
//         {/* Header */}
//         <div className="py-8 border-b border-gray-200">
//           <h1 className="text-4xl font-bold text-black mb-2">Learning Hub</h1>
//           <p className="text-gray-600">
//             Discover courses and expand your skills
//           </p>
//         </div>

//         {/* Featured Courses */}
//         <div className="py-8">
//           <FeaturedSection
//             title="Featured Courses"
//             subtitle="Handpicked by our instructors"
//             items={featuredCourses}
//             onItemClick={(course) => setSelectedCourse(course)}
//             onViewAll={() => console.log("View all courses")}
//           />
//         </div>

//         {/* Trending Topics */}
//         <div className="py-8 border-t border-gray-200">
//           <FeaturedSection
//             title="Trending Topics"
//             subtitle="What developers are learning right now"
//             items={trendingTopics}
//             maxItems={3}
//             onViewAll={() => console.log("View all trending")}
//           />
//         </div>

//         {/* Selected Course Details */}
//         {selectedCourse && (
//           <div className="py-8 border-t border-gray-200">
//             <Card
//               variant="elevated"
//               header={
//                 <h2 className="text-2xl font-bold">{selectedCourse.name}</h2>
//               }
//             >
//               <p className="text-gray-600 mb-4">{selectedCourse.description}</p>
//               <div className="flex gap-2">
//                 <Button label="Enroll Now" variant="primary" />
//                 <Button label="Learn More" variant="outline" />
//               </div>
//             </Card>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }