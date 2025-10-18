import { ReactElement, useMemo } from "react";
import { Card, Button } from "@/components/UI";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactElement;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "compact" | "expanded";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Icon size mapping
const ICON_SIZES = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-20 h-20",
};

const PADDING_MAP = {
  default: "p-8 sm:p-12",
  compact: "p-6 sm:p-8",
  expanded: "p-12 sm:p-16",
};

const TITLE_SIZE = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

const DESCRIPTION_SIZE = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = "default",
  size = "md",
  className = "",
}: EmptyStateProps) {
  // Memoize derived styles
  const styles = useMemo(
    () => ({
      iconSize: ICON_SIZES[size],
      padding: PADDING_MAP[variant],
      titleSize: TITLE_SIZE[size],
      descriptionSize: DESCRIPTION_SIZE[size],
    }),
    [size, variant]
  );

  const maxWidth = useMemo(() => {
    switch (variant) {
      case "compact":
        return "max-w-sm";
      case "expanded":
        return "max-w-lg";
      default:
        return "max-w-md";
    }
  }, [variant]);

  return (
    <Card
      variant="elevated"
      className={`text-center ${styles.padding} ${className}`}
    >
      <div className={`${maxWidth} mx-auto space-y-4`}>
        {/* Icon */}
        {icon && (
          <div
            className={`
              mx-auto ${styles.iconSize}
              bg-indigo-50 dark:bg-indigo-950/40
              rounded-full flex items-center justify-center
              text-indigo-400 dark:text-indigo-600
              flex-shrink-0
            `}
          >
            {icon}
          </div>
        )}

        {/* Content */}
        <div className="space-y-2">
          <h3
            className={`
              ${styles.titleSize} font-semibold
              text-gray-900 dark:text-gray-100
            `}
          >
            {title}
          </h3>

          {description && (
            <p
              className={`
                ${styles.descriptionSize}
                text-gray-500 dark:text-gray-400
                leading-relaxed
              `}
            >
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div
            className={`
              flex flex-col sm:flex-row gap-3 justify-center pt-2
              ${variant === "compact" ? "gap-2" : ""}
            `}
          >
            {action && (
              <Button
                variant="primary"
                label={action.label}
                onClick={action.onClick}
              />
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                label={secondaryAction.label}
                onClick={secondaryAction.onClick}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Usage Examples:
// ============================================
// EmptyState Usage Examples - Educational Platform
// ============================================

// "use client";

// import { useRouter } from "next/navigation";
// import EmptyState from "@/components/UI/emptystate";
// import {
//   LuBookOpen,
//   LuFileText,
//   LuPlay,
//   LuCheckCircle,
//   LuBarChart3,
//   LuClipboardList,
//   LuSearch,
//   LuPlus,
//   LuArrowRight,
// } from "react-icons/lu";

// // ============================================
// // 1. No Courses Enrolled
// // ============================================

// export function NoCourses() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuBookOpen className="w-8 h-8" />}
//       title="No Courses Yet"
//       description="Start learning by enrolling in a course. Browse our catalog to find courses that interest you."
//       action={{
//         label: "Browse Courses",
//         onClick: () => router.push("/courses"),
//       }}
//       secondaryAction={{
//         label: "View Recommendations",
//         onClick: () => router.push("/recommendations"),
//       }}
//       size="md"
//     />
//   );
// }

// // ============================================
// // 2. No Lessons in Course
// // ============================================

// export function NoLessons({ courseId }: { courseId: string }) {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuPlay className="w-8 h-8" />}
//       title="No Lessons Available"
//       description="The instructor hasn't added any lessons to this course yet. Check back soon!"
//       secondaryAction={{
//         label: "Go Back to Courses",
//         onClick: () => router.push("/courses"),
//       }}
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 3. No Assignments Submitted
// // ============================================

// export function NoAssignmentsSubmitted() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuClipboardList className="w-8 h-8" />}
//       title="No Submissions Yet"
//       description="You haven't submitted any assignments yet. Start completing your assignments to progress in the course."
//       action={{
//         label: "View Assignments",
//         onClick: () => router.push("/assignments"),
//       }}
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 4. Search - No Results
// // ============================================

// export function NoSearchResults({ query }: { query: string }) {
//   return (
//     <EmptyState
//       icon={<LuSearch className="w-8 h-8" />}
//       title="No Results Found"
//       description={`We couldn't find any courses matching "${query}". Try adjusting your search terms or browse our course categories.`}
//       action={{
//         label: "Clear Search",
//         onClick: () => window.location.reload(),
//       }}
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 5. No Saved/Bookmarked Courses
// // ============================================

// export function NoBookmarkedCourses() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuBookOpen className="w-8 h-8" />}
//       title="No Saved Courses"
//       description="You haven't bookmarked any courses yet. Save courses you're interested in to view them later."
//       action={{
//         label: "Explore Courses",
//         onClick: () => router.push("/courses"),
//       }}
//       variant="compact"
//     />
//   );
// }

// // ============================================
// // 6. Student Progress - No Activity
// // ============================================

// export function NoProgressActivity() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuBarChart3 className="w-8 h-8" />}
//       title="No Learning Activity"
//       description="Start a course or complete lessons to see your progress tracked here."
//       action={{
//         label: "Enroll in a Course",
//         onClick: () => router.push("/courses"),
//       }}
//       variant="expanded"
//       size="lg"
//     />
//   );
// }

// // ============================================
// // 7. No Course Materials/Resources
// // ============================================

// export function NoCourseResources({ courseId }: { courseId: string }) {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuFileText className="w-8 h-8" />}
//       title="No Resources Available"
//       description="The instructor hasn't uploaded any materials for this course section yet. Check back soon for resources."
//       secondaryAction={{
//         label: "Back to Course",
//         onClick: () => router.push(`/courses/${courseId}`),
//       }}
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 8. No Certificates Earned
// // ============================================

// export function NoCertificates() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuCheckCircle className="w-8 h-8" />}
//       title="No Certificates Yet"
//       description="Complete courses to earn certificates. Start by finishing your current course or enrolling in a new one."
//       action={{
//         label: "View My Courses",
//         onClick: () => router.push("/my-learning"),
//       }}
//       variant="compact"
//     />
//   );
// }

// // ============================================
// // 9. Instructor Dashboard - No Students
// // ============================================

// export function NoStudentsEnrolled() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuBarChart3 className="w-8 h-8" />}
//       title="No Students Yet"
//       description="Your course hasn't received any enrollments yet. Share your course link to start attracting students."
//       secondaryAction={{
//         label: "Share Course",
//         onClick: () => {
//           // Share logic
//           navigator.clipboard.writeText(window.location.href);
//         },
//       }}
//       variant="expanded"
//       size="lg"
//     />
//   );
// }

// // ============================================
// // 10. Instructor Dashboard - No Course Created
// // ============================================

// export function NoCourses_Instructor() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuPlus className="w-8 h-8" />}
//       title="Create Your First Course"
//       description="Start teaching by creating a course. Share your knowledge with students around the world."
//       action={{
//         label: "Create Course",
//         onClick: () => router.push("/instructor/courses/create"),
//       }}
//       secondaryAction={{
//         label: "Learn How",
//         onClick: () => router.push("/instructor/guides/create-course"),
//       }}
//       variant="expanded"
//       size="lg"
//     />
//   );
// }

// // ============================================
// // 11. No Announcements/Messages
// // ============================================

// export function NoAnnouncements() {
//   return (
//     <EmptyState
//       icon={<LuFileText className="w-8 h-8" />}
//       title="No Announcements"
//       description="Your instructor hasn't posted any announcements yet. Check back for course updates and important information."
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 12. Admin - No Pending Approvals
// // ============================================

// export function NoPendingApprovals() {
//   return (
//     <EmptyState
//       icon={<LuCheckCircle className="w-8 h-8" />}
//       title="All Caught Up!"
//       description="You have no pending course approvals or content reviews. Great work!"
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 13. Empty Discussion Forum
// // ============================================

// export function NoDiscussionThreads() {
//   return (
//     <EmptyState
//       icon={<LuFileText className="w-8 h-8" />}
//       title="Start a Discussion"
//       description="Be the first to start a discussion thread! Ask questions and share insights with other students."
//       action={{
//         label: "Create Thread",
//         onClick: () => {
//           const modal = document.querySelector("[data-modal='create-thread']");
//           if (modal) (modal as HTMLElement).click();
//         },
//       }}
//       variant="compact"
//     />
//   );
// }

// // ============================================
// // 14. Empty Grading Queue
// // ============================================

// export function NoAssignmentsToGrade() {
//   return (
//     <EmptyState
//       icon={<LuCheckCircle className="w-8 h-8" />}
//       title="All Assignments Graded"
//       description="You've graded all submitted assignments. Check back when students submit more work."
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 15. Empty Notifications
// // ============================================

// export function NoNotifications() {
//   return (
//     <EmptyState
//       icon={<LuFileText className="w-8 h-8" />}
//       title="No Notifications"
//       description="You're all set! You don't have any new notifications."
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 16. Completed Course - Invitation to New Courses
// // ============================================

// export function CourseCompleted() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuCheckCircle className="w-8 h-8" />}
//       title="Course Completed!"
//       description="Congratulations on finishing the course! Your certificate has been issued. Ready to learn something new?"
//       action={{
//         label: "Browse More Courses",
//         onClick: () => router.push("/courses"),
//       }}
//       secondaryAction={{
//         label: "View Certificate",
//         onClick: () => router.push("/certificates"),
//       }}
//       variant="expanded"
//       size="lg"
//     />
//   );
// }

// // ============================================
// // 17. Filter Applied - No Results
// // ============================================

// export function NoFilteredResults({ filterName }: { filterName: string }) {
//   return (
//     <EmptyState
//       icon={<LuSearch className="w-8 h-8" />}
//       title="No Results"
//       description={`There are no courses matching your filter: "${filterName}". Try different filters or browse all courses.`}
//       action={{
//         label: "Clear Filters",
//         onClick: () => window.location.reload(),
//       }}
//       variant="compact"
//       size="sm"
//     />
//   );
// }

// // ============================================
// // 18. Premium Feature - Upgrade Required
// // ============================================

// export function UpgradeRequired() {
//   const router = useRouter();

//   return (
//     <EmptyState
//       icon={<LuArrowRight className="w-8 h-8" />}
//       title="Premium Feature"
//       description="This feature is only available for premium members. Upgrade your account to unlock advanced learning tools and exclusive content."
//       action={{
//         label: "Upgrade Now",
//         onClick: () => router.push("/billing/upgrade"),
//       }}
//       variant="compact"
//     />
//   );
// }

// // ============================================
// // 19. Empty List with Inline State
// // ============================================

// export function CoursesList() {
//   const courses = []; // Empty array

//   if (courses.length === 0) {
//     return (
//       <EmptyState
//         icon={<LuBookOpen className="w-8 h-8" />}
//         title="Start Your Learning Journey"
//         description="You're not enrolled in any courses yet. Explore our catalog and find courses that match your interests."
//         action={{
//           label: "Explore Catalog",
//           onClick: () => window.location.href = "/courses",
//         }}
//       />
//     );
//   }

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//       {/* Course cards here */}
//     </div>
//   );
// }

// // ============================================
// // 20. Full-Page Empty State Layout
// // ============================================

// export function FullPageEmptyState() {
//   const router = useRouter();

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
//       <EmptyState
//         icon={<LuBookOpen className="w-8 h-8" />}
//         title="Welcome to Your Learning Dashboard"
//         description="You haven't started any courses yet. Begin your learning journey by exploring our course catalog."
//         action={{
//           label: "Browse Courses",
//           onClick: () => router.push("/courses"),
//         }}
//         secondaryAction={{
//           label: "View Recommendations",
//           onClick: () => router.push("/recommendations"),
//         }}
//         variant="expanded"
//         size="lg"
//         className="w-full"
//       />
//     </div>
//   );
// }

// // ============================================
// // 21. Dynamic Empty State Component
// // ============================================

// interface ContentListProps {
//   items: any[];
//   emptyTitle: string;
//   emptyDescription: string;
//   emptyIcon: React.ReactElement;
//   onEmptyAction?: () => void;
//   actionLabel?: string;
//   children: React.ReactNode;
// }

// export function ContentList({
//   items,
//   emptyTitle,
//   emptyDescription,
//   emptyIcon,
//   onEmptyAction,
//   actionLabel = "Get Started",
//   children,
// }: ContentListProps) {
//   if (items.length === 0) {
//     return (
//       <EmptyState
//         icon={emptyIcon}
//         title={emptyTitle}
//         description={emptyDescription}
//         action={onEmptyAction ? { label: actionLabel, onClick: onEmptyAction } : undefined}
//         variant="compact"
//       />
//     );
//   }

//   return <>{children}</>;
// }

// // ============================================
// // Usage:
// // ============================================

// // <ContentList
// //   items={courses}
// //   emptyTitle="No Courses"
// //   emptyDescription="Get started by enrolling in a course"
// //   emptyIcon={<LuBookOpen className="w-8 h-8" />}
// //   onEmptyAction={() => router.push("/courses")}
// //   actionLabel="Browse Courses"
// // >
// //   <div className="grid gap-4">
// //     {courses.map(course => <CourseCard key={course.id} {...course} />)}
// //   </div>
// // </ContentList>