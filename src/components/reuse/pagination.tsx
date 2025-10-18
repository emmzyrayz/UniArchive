import { useMemo, useCallback } from "react";
import { Button } from "@/components/UI";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  showInfo?: boolean;
  className?: string;
  delta?: number;
  disabled?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  showPageNumbers = true,
  showInfo = true,
  className = "",
  delta = 2,
  disabled = false,
}: PaginationProps) {
  // Validate and clamp currentPage
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const getVisiblePages = useCallback(() => {
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    // Generate page range around current page
    for (
      let i = Math.max(2, validCurrentPage - delta);
      i <= Math.min(totalPages - 1, validCurrentPage + delta);
      i++
    ) {
      range.push(i);
    }

    // Add first page
    rangeWithDots.push(1);

    // Add dots and range if gap exists
    if (validCurrentPage - delta > 2) {
      rangeWithDots.push("...");
    }

    rangeWithDots.push(...range);

    // Add dots and last page if gap exists
    if (validCurrentPage + delta < totalPages - 1) {
      rangeWithDots.push("...");
    }

    // Add last page if more than 1 page
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [validCurrentPage, totalPages, delta]);

  const visiblePages = useMemo(() => getVisiblePages(), [getVisiblePages]);

  const paginationInfo = useMemo(() => {
    if (!totalItems) return null;

    const startItem = (validCurrentPage - 1) * pageSize + 1;
    const endItem = Math.min(validCurrentPage * pageSize, totalItems);

    return { startItem, endItem };
  }, [validCurrentPage, pageSize, totalItems]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (!disabled && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    },
    [disabled, totalPages, onPageChange]
  );

  const handlePrevious = useCallback(() => {
    handlePageChange(validCurrentPage - 1);
  }, [validCurrentPage, handlePageChange]);

  const handleNext = useCallback(() => {
    handlePageChange(validCurrentPage + 1);
  }, [validCurrentPage, handlePageChange]);

  const isPreviousDisabled = validCurrentPage <= 1 || disabled;
  const isNextDisabled = validCurrentPage >= totalPages || disabled;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Page Info */}
      {showInfo && paginationInfo && (
        <div className="hidden sm:block order-1">
          <p className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold text-black">
              {paginationInfo.startItem}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-black">
              {paginationInfo.endItem}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-black">
              {totalItems.toLocaleString()}
            </span>{" "}
            results
          </p>
        </div>
      )}

      {/* Page Navigation */}
      <div className="flex items-center gap-1 order-2 sm:order-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isPreviousDisabled}
          className="text-sm px-2"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          }
          iconPosition="left"
          label={showPageNumbers ? "Previous" : undefined}
          aria-label="Go to previous page"
        />

        {/* Page Numbers */}
        {showPageNumbers && (
          <div className="flex items-center gap-1">
            {visiblePages.map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 py-2 text-sm text-gray-500"
                    aria-hidden="true"
                  >
                    …
                  </span>
                );
              }

              const pageNum = page as number;
              const isCurrentPage = pageNum === validCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={disabled}
                  className={`
                    min-w-[40px] px-2 py-2 text-sm font-medium rounded-lg
                    transition-all duration-200
                    ${
                      isCurrentPage
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }
                    ${
                      disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }
                  `}
                  aria-current={isCurrentPage ? "page" : undefined}
                  aria-label={`Go to page ${pageNum}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Next Button */}
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={isNextDisabled}
          className="text-sm px-2"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          }
          iconPosition="right"
          label={showPageNumbers ? "Next" : undefined}
          aria-label="Go to next page"
        />
      </div>

      {/* Mobile Info */}
      {showInfo && paginationInfo && (
        <div className="sm:hidden text-sm text-gray-600 order-3">
          <span className="font-semibold text-black">{validCurrentPage}</span>{" "}
          of <span className="font-semibold text-black">{totalPages}</span>
        </div>
      )}
    </div>
  );
}


// Usage Patterns
// Basic Pagination
// typescript<Pagination
//   currentPage={page}
//   totalPages={Math.ceil(total / 10)}
//   onPageChange={setPage}
// />
// With Item Count
// typescript<Pagination
//   currentPage={page}
//   totalPages={Math.ceil(total / 10)}
//   totalItems={total}
//   pageSize={10}
//   onPageChange={setPage}
// />
// Custom Range
// typescript<Pagination
//   currentPage={page}
//   totalPages={Math.ceil(total / 20)}
//   onPageChange={setPage}
//   delta={3}
// />
// Disabled State
// typescript<Pagination
//   currentPage={page}
//   totalPages={totalPages}
//   onPageChange={setPage}
//   disabled={isLoading}
// />

// import Pagination from "@/components/Pagination";
// import { Card } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Course List with Pagination
// export function CourseListPagination() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const pageSize = 10;
//   const totalCourses = 45;

//   const courses = [
//     { id: 1, title: "React Fundamentals", enrolled: 250 },
//     { id: 2, title: "TypeScript Mastery", enrolled: 180 },
//     { id: 3, title: "Web Performance", enrolled: 120 },
//     { id: 4, title: "CSS Grid & Flexbox", enrolled: 200 },
//     { id: 5, title: "JavaScript Async", enrolled: 150 },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Available Courses</h2>

//       <div className="space-y-3">
//         {courses.map((course) => (
//           <Card
//             key={course.id}
//             variant="outlined"
//             className="p-4 flex justify-between"
//           >
//             <div>
//               <h3 className="font-semibold text-black">{course.title}</h3>
//               <p className="text-sm text-gray-600">
//                 {course.enrolled} enrolled
//               </p>
//             </div>
//           </Card>
//         ))}
//       </div>

//       <Pagination
//         currentPage={currentPage}
//         totalPages={Math.ceil(totalCourses / pageSize)}
//         totalItems={totalCourses}
//         pageSize={pageSize}
//         onPageChange={setCurrentPage}
//         showPageNumbers={true}
//         showInfo={true}
//       />
//     </div>
//   );
// }

// // Example 2: Student Results with Filtering
// export function StudentResultsPagination() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const pageSize = 15;
//   const totalStudents = 127;

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Student Results</h2>

//       <Card variant="elevated" className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-gray-200">
//               <th className="px-4 py-3 text-left font-semibold text-black">
//                 Name
//               </th>
//               <th className="px-4 py-3 text-left font-semibold text-black">
//                 Email
//               </th>
//               <th className="px-4 py-3 text-left font-semibold text-black">
//                 Score
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {[1, 2, 3, 4, 5].map((i) => (
//               <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
//                 <td className="px-4 py-3 text-gray-900">Student {i}</td>
//                 <td className="px-4 py-3 text-gray-600">
//                   student{i}@example.com
//                 </td>
//                 <td className="px-4 py-3 text-gray-900 font-medium">
//                   {85 + i}%
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </Card>

//       <Pagination
//         currentPage={currentPage}
//         totalPages={Math.ceil(totalStudents / pageSize)}
//         totalItems={totalStudents}
//         pageSize={pageSize}
//         onPageChange={setCurrentPage}
//       />
//     </div>
//   );
// }

// // Example 3: Search Results with Many Pages
// export function SearchResultsPagination() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const pageSize = 20;
//   const totalResults = 543;

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">Search Results</h2>
//         <p className="text-gray-600">
//           Found {totalResults} results for "React"
//         </p>
//       </div>

//       <div className="space-y-3">
//         {[1, 2, 3, 4, 5].map((i) => (
//           <Card
//             key={i}
//             variant="outlined"
//             className="p-4 hover:shadow-md transition-shadow"
//           >
//             <h3 className="font-semibold text-black text-lg mb-1">
//               Result {i}
//             </h3>
//             <p className="text-gray-600 text-sm mb-2">
//               This is a search result related to React development and best
//               practices...
//             </p>
//             <a
//               href="#"
//               className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
//             >
//               Learn more →
//             </a>
//           </Card>
//         ))}
//       </div>

//       <Pagination
//         currentPage={currentPage}
//         totalPages={Math.ceil(totalResults / pageSize)}
//         totalItems={totalResults}
//         pageSize={pageSize}
//         onPageChange={setCurrentPage}
//         delta={3}
//       />
//     </div>
//   );
// }

// // Example 4: Assignment Submissions
// export function AssignmentSubmissionsPagination() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const pageSize = 10;
//   const totalSubmissions = 89;

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Assignment Submissions</h2>

//       <Card variant="elevated" className="space-y-3">
//         {[1, 2, 3, 4, 5].map((i) => (
//           <div
//             key={i}
//             className="p-4 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
//           >
//             <div>
//               <p className="font-medium text-black">Student {i}</p>
//               <p className="text-xs text-gray-500">Submitted 2 hours ago</p>
//             </div>
//             <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
//               Submitted
//             </div>
//           </div>
//         ))}
//       </Card>

//       <Pagination
//         currentPage={currentPage}
//         totalPages={Math.ceil(totalSubmissions / pageSize)}
//         totalItems={totalSubmissions}
//         pageSize={pageSize}
//         onPageChange={setCurrentPage}
//       />
//     </div>
//   );
// }

// // Example 5: Minimal Pagination (Numbers Only)
// export function MinimalPagination() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const totalPages = 8;

//   return (
//     <div className="p-6 space-y-6">
//       <div className="space-y-4">
//         {[1, 2, 3, 4].map((i) => (
//           <Card key={i} variant="outlined" className="p-3">
//             <p className="text-sm text-gray-700">Item {i}</p>
//           </Card>
//         ))}
//       </div>

//       <Pagination
//         currentPage={currentPage}
//         totalPages={totalPages}
//         onPageChange={setCurrentPage}
//         showPageNumbers={true}
//         showInfo={false}
//       />
//     </div>
//   );
// }

// // Example 6: Complete Pagination Dashboard
// export default function PaginationDashboard() {
//   const [coursePagen, setCoursePagen] = useState(1);
//   const [assignmentPage, setAssignmentPage] = useState(1);

//   const coursePageSize = 12;
//   const totalCourses = 47;

//   const assignmentPageSize = 10;
//   const totalAssignments = 34;

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="mb-12 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Content Management
//           </h1>
//           <p className="text-gray-600">
//             Browse and manage all courses and assignments
//           </p>
//         </div>

//         {/* Courses Section */}
//         <div className="mb-12">
//           <h2 className="text-2xl font-bold text-black mb-6">Courses</h2>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
//             {[1, 2, 3, 4, 5, 6].map((i) => (
//               <Card
//                 key={i}
//                 variant="outlined"
//                 className="p-4 hover:shadow-md transition-shadow"
//               >
//                 <h3 className="font-semibold text-black mb-2">
//                   Course {coursePagen * 12 - 12 + i}
//                 </h3>
//                 <p className="text-xs text-gray-600">
//                   {Math.floor(Math.random() * 300) + 50} students enrolled
//                 </p>
//               </Card>
//             ))}
//           </div>

//           <Pagination
//             currentPage={coursePagen}
//             totalPages={Math.ceil(totalCourses / coursePageSize)}
//             totalItems={totalCourses}
//             pageSize={coursePageSize}
//             onPageChange={setCoursePagen}
//             showPageNumbers={true}
//             showInfo={true}
//             className="mb-12 pb-12 border-b border-gray-200"
//           />
//         </div>

//         {/* Assignments Section */}
//         <div>
//           <h2 className="text-2xl font-bold text-black mb-6">Assignments</h2>

//           <div className="space-y-3 mb-6">
//             {[1, 2, 3, 4, 5].map((i) => (
//               <Card
//                 key={i}
//                 variant="outlined"
//                 className="p-4 flex justify-between items-center"
//               >
//                 <div>
//                   <h3 className="font-semibold text-black">
//                     Assignment {assignmentPage * 10 - 10 + i}
//                   </h3>
//                   <p className="text-xs text-gray-600">Due in 3 days</p>
//                 </div>
//                 <div className="text-right">
//                   <p className="font-medium text-black">12/15</p>
//                   <p className="text-xs text-gray-600">submitted</p>
//                 </div>
//               </Card>
//             ))}
//           </div>

//           <Pagination
//             currentPage={assignmentPage}
//             totalPages={Math.ceil(totalAssignments / assignmentPageSize)}
//             totalItems={totalAssignments}
//             pageSize={assignmentPageSize}
//             onPageChange={setAssignmentPage}
//             showPageNumbers={true}
//             showInfo={true}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }