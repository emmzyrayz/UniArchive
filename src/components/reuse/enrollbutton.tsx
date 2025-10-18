import { useState, useCallback, useMemo } from "react";
import { Button, Modal, Alert, Checkbox } from "@/components/UI";

interface EnrollButtonProps {
  courseId: string;
  courseTitle: string;
  isEnrolled?: boolean;
  price?: number;
  onEnroll: (courseId: string) => Promise<void>;
  onContinue?: (courseId: string) => void;
  className?: string;
}

export default function EnrollButton({
  courseId,
  courseTitle,
  isEnrolled = false,
  price,
  onEnroll,
  onContinue,
  className = "",
}: EnrollButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleEnroll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onEnroll(courseId);
      setShowConfirm(false);
      setTermsAccepted(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to enroll in course";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, onEnroll]);

  const handleContinue = useCallback(() => {
    onContinue?.(courseId);
  }, [courseId, onContinue]);

  const handleOpenModal = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isLoading) {
      setShowConfirm(false);
      setError(null);
      setTermsAccepted(false);
    }
  }, [isLoading]);

  const enrollButtonLabel = useMemo(
    () =>
      price !== undefined
        ? `Enroll for $${price.toFixed(2)}`
        : "Enroll for Free",
    [price]
  );

  const isEnrollDisabled = isLoading || !termsAccepted;

  // Enrolled state
  if (isEnrolled) {
    return (
      <Button
        variant="primary"
        label="Continue Learning"
        onClick={handleContinue}
        className={className}
        aria-label="Continue learning in this course"
      />
    );
  }

  // Enroll state
  return (
    <>
      <Button
        variant="primary"
        label={enrollButtonLabel}
        onClick={handleOpenModal}
        className={className}
        aria-label={`Enroll in ${courseTitle}`}
      />

      <Modal
        isOpen={showConfirm}
        onClose={handleCloseModal}
        title="Enroll in Course"
        size="sm"
        closeOnEsc={!isLoading}
        closeOnOverlayClick={!isLoading}
      >
        <div className="space-y-4">
          {error && (
            <Alert
              type="error"
              message={error}
              closable
              onClose={() => setError(null)}
            />
          )}

          <p className="text-gray-600">
            Are you sure you want to enroll in{" "}
            <strong className="text-black">{courseTitle}</strong>?
            {price !== undefined && (
              <span> This will cost ${price.toFixed(2)}.</span>
            )}
          </p>

          <div className="space-y-3">
            {/* Terms Checkbox */}
            <Checkbox
              label="I agree to the terms and conditions"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              disabled={isLoading}
            />

            {/* Free Course Info */}
            {price === undefined && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-green-700 font-medium">
                  This course is free!
                </span>
              </div>
            )}

            {/* Paid Course Info */}
            {price !== undefined && price > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-blue-700 font-medium">
                  Payment will be processed after confirmation
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              label="Cancel"
              onClick={handleCloseModal}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              variant="primary"
              label={isLoading ? "Enrolling..." : "Confirm Enrollment"}
              loading={isLoading}
              onClick={handleEnroll}
              disabled={isEnrollDisabled}
              className="flex-1"
              aria-label={
                isLoading
                  ? "Enrollment in progress"
                  : "Confirm enrollment in course"
              }
            />
          </div>
        </div>
      </Modal>
    </>
  );
}


// Usage Examples:

// import EnrollButton from "@/components/EnrollButton";
// import { Card, Alert } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Free Course Enrollment
// export function FreeCourseEnrollExample() {
//   const handleEnroll = async (courseId: string) => {
//     await new Promise((resolve) => setTimeout(resolve, 1500));
//     console.log("Enrolled in free course:", courseId);
//   };

//   const handleContinue = (courseId: string) => {
//     console.log("Continue learning in:", courseId);
//   };

//   return (
//     <div className="p-6 space-y-4">
//       <Card variant="elevated" className="p-6">
//         <h3 className="text-lg font-semibold text-black mb-2">
//           React Fundamentals
//         </h3>
//         <p className="text-gray-600 mb-4">
//           Learn the basics of React including components, hooks, and state
//           management.
//         </p>
//         <EnrollButton
//           courseId="react-basics"
//           courseTitle="React Fundamentals"
//           onEnroll={handleEnroll}
//           onContinue={handleContinue}
//         />
//       </Card>
//     </div>
//   );
// }

// // Example 2: Paid Course Enrollment
// export function PaidCourseEnrollExample() {
//   const handleEnroll = async (courseId: string) => {
//     await new Promise((resolve) => setTimeout(resolve, 2000));
//     console.log("Enrolled in paid course:", courseId);
//   };

//   return (
//     <div className="p-6 space-y-4">
//       <Card variant="elevated" className="p-6">
//         <h3 className="text-lg font-semibold text-black mb-2">
//           Advanced React Patterns
//         </h3>
//         <p className="text-gray-600 mb-4">
//           Master advanced React patterns and best practices for production
//           applications.
//         </p>
//         <EnrollButton
//           courseId="react-advanced"
//           courseTitle="Advanced React Patterns"
//           price={49.99}
//           onEnroll={handleEnroll}
//         />
//       </Card>
//     </div>
//   );
// }

// // Example 3: Enrolled Course (Continue Learning)
// export function EnrolledCourseExample() {
//   const handleContinue = (courseId: string) => {
//     console.log("Navigating to course:", courseId);
//   };

//   return (
//     <div className="p-6 space-y-4">
//       <Card variant="elevated" className="p-6">
//         <h3 className="text-lg font-semibold text-black mb-2">
//           TypeScript Fundamentals
//         </h3>
//         <p className="text-gray-600 mb-4">Progress: 65%</p>
//         <EnrollButton
//           courseId="typescript-101"
//           courseTitle="TypeScript Fundamentals"
//           isEnrolled={true}
//           onContinue={handleContinue}
//           onEnroll={async () => {}}
//         />
//       </Card>
//     </div>
//   );
// }

// // Example 4: With Error Handling
// export function EnrollButtonWithErrorExample() {
//   const [error, setError] = useState<string | null>(null);

//   const handleEnroll = async (courseId: string) => {
//     try {
//       // Simulate payment error
//       if (courseId === "premium-course") {
//         throw new Error("Payment failed. Please check your card details.");
//       }
//       await new Promise((resolve) => setTimeout(resolve, 1500));
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Enrollment failed");
//       throw err;
//     }
//   };

//   return (
//     <div className="p-6 space-y-4">
//       {error && (
//         <Alert
//           type="error"
//           message={error}
//           closable
//           onClose={() => setError(null)}
//         />
//       )}

//       <Card variant="elevated" className="p-6">
//         <h3 className="text-lg font-semibold text-black mb-2">
//           Premium Web Development
//         </h3>
//         <p className="text-gray-600 mb-4">
//           Comprehensive web development course with certification.
//         </p>
//         <EnrollButton
//           courseId="premium-course"
//           courseTitle="Premium Web Development"
//           price={99.99}
//           onEnroll={handleEnroll}
//         />
//       </Card>
//     </div>
//   );
// }

// // Example 5: Course Catalog with Multiple Enrollments
// export function CourseCatalogExample() {
//   const [enrolledCourses, setEnrolledCourses] = useState(new Set(["ts-101"]));

//   const courses = [
//     {
//       id: "react-101",
//       title: "React Fundamentals",
//       description: "Learn React basics",
//       price: undefined,
//     },
//     {
//       id: "react-advanced",
//       title: "Advanced React Patterns",
//       description: "Master advanced concepts",
//       price: 49.99,
//     },
//     {
//       id: "ts-101",
//       title: "TypeScript Fundamentals",
//       description: "Learn TypeScript",
//       price: 29.99,
//     },
//     {
//       id: "nodejs-101",
//       title: "Node.js Backend",
//       description: "Build backend with Node",
//       price: 39.99,
//     },
//   ];

//   const handleEnroll = async (courseId: string) => {
//     await new Promise((resolve) => setTimeout(resolve, 1500));
//     setEnrolledCourses((prev) => new Set([...prev, courseId]));
//   };

//   const handleContinue = (courseId: string) => {
//     console.log("Navigating to:", courseId);
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Course Catalog</h2>

//       <div className="grid md:grid-cols-2 gap-6">
//         {courses.map((course) => (
//           <Card key={course.id} variant="outlined" className="p-6 space-y-4">
//             <div>
//               <h3 className="text-lg font-semibold text-black mb-2">
//                 {course.title}
//               </h3>
//               <p className="text-gray-600 text-sm">{course.description}</p>
//             </div>

//             <EnrollButton
//               courseId={course.id}
//               courseTitle={course.title}
//               price={course.price}
//               isEnrolled={enrolledCourses.has(course.id)}
//               onEnroll={handleEnroll}
//               onContinue={handleContinue}
//             />
//           </Card>
//         ))}
//       </div>
//     </div>
//   );
// }

// // Example 6: Complete Course Card with Enrollment
// export default function CourseCatalogDashboard() {
//   const [enrolledCourses, setEnrolledCourses] = useState(new Set<string>());
//   const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

//   const courses = [
//     {
//       id: "react-fund",
//       title: "React Fundamentals",
//       instructor: "Sarah Chen",
//       students: 2450,
//       rating: 4.8,
//       description: "Master the basics of React development",
//       price: undefined,
//       level: "Beginner",
//     },
//     {
//       id: "react-adv",
//       title: "Advanced React Patterns",
//       instructor: "John Smith",
//       students: 1200,
//       rating: 4.9,
//       description: "Learn advanced patterns and best practices",
//       price: 49.99,
//       level: "Advanced",
//     },
//     {
//       id: "typescript",
//       title: "TypeScript Mastery",
//       instructor: "Emma Wilson",
//       students: 890,
//       rating: 4.7,
//       description: "Complete TypeScript guide with real projects",
//       price: 39.99,
//       level: "Intermediate",
//     },
//   ];

//   const handleEnroll = async (courseId: string) => {
//     try {
//       await new Promise((resolve) => setTimeout(resolve, 1500));
//       setEnrolledCourses((prev) => new Set([...prev, courseId]));
//       setEnrollmentSuccess(true);
//       setTimeout(() => setEnrollmentSuccess(false), 3000);
//     } catch (err) {
//       console.error("Enrollment failed:", err);
//     }
//   };

//   const handleContinue = (courseId: string) => {
//     console.log("Opening course:", courseId);
//   };

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="mb-12">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Featured Courses
//           </h1>
//           <p className="text-gray-600">
//             Start learning from industry experts today
//           </p>
//         </div>

//         {/* Success Message */}
//         {enrollmentSuccess && (
//           <Alert
//             type="success"
//             message="Successfully enrolled in course! Welcome aboard."
//             className="mb-6"
//           />
//         )}

//         {/* Courses Grid */}
//         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {courses.map((course) => (
//             <Card
//               key={course.id}
//               variant="elevated"
//               className="overflow-hidden"
//             >
//               {/* Course Header */}
//               <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-6">
//                 <h3 className="text-xl font-bold text-white mb-1">
//                   {course.title}
//                 </h3>
//                 <p className="text-indigo-100 text-sm">
//                   by {course.instructor}
//                 </p>
//               </div>

//               {/* Course Content */}
//               <div className="p-6 space-y-4">
//                 <p className="text-gray-600 text-sm">{course.description}</p>

//                 {/* Stats */}
//                 <div className="flex items-center justify-between text-sm">
//                   <span className="text-gray-600">
//                     ⭐ {course.rating} ({course.students} students)
//                   </span>
//                   <span
//                     className={`px-3 py-1 rounded-full text-xs font-medium ${
//                       course.level === "Beginner"
//                         ? "bg-green-100 text-green-700"
//                         : course.level === "Intermediate"
//                         ? "bg-yellow-100 text-yellow-700"
//                         : "bg-red-100 text-red-700"
//                     }`}
//                   >
//                     {course.level}
//                   </span>
//                 </div>

//                 {/* Price */}
//                 {course.price && (
//                   <div className="text-2xl font-bold text-black">
//                     ${course.price.toFixed(2)}
//                   </div>
//                 )}

//                 {/* Enroll Button */}
//                 <EnrollButton
//                   courseId={course.id}
//                   courseTitle={course.title}
//                   price={course.price}
//                   isEnrolled={enrolledCourses.has(course.id)}
//                   onEnroll={handleEnroll}
//                   onContinue={handleContinue}
//                   className="w-full"
//                 />
//               </div>
//             </Card>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }