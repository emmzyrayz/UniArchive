import { useState, useCallback, useMemo } from "react";

interface RatingInputProps {
  value?: number;
  onChange?: (rating: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
  clearable?: boolean;
  onClear?: () => void;
  showFeedback?: boolean;
}

export default function RatingInput({
  value = 0,
  onChange,
  max = 5,
  size = "md",
  readonly = false,
  showLabel = true,
  label = "Rating",
  className = "",
  clearable = false,
  onClear,
  showFeedback = true,
}: RatingInputProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(value);

  const sizeStyles = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textStyles = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const gapStyles = {
    sm: "gap-0.5",
    md: "gap-1",
    lg: "gap-2",
  };

  const getRatingLabel = useCallback((rating: number): string => {
    const labels: Record<number, string> = {
      1: "Poor",
      2: "Fair",
      3: "Good",
      4: "Very Good",
      5: "Excellent",
    };
    return labels[rating] || `${rating} Stars`;
  }, []);

  const handleRatingClick = useCallback(
    (rating: number) => {
      if (readonly) return;

      setCurrentRating(rating);
      onChange?.(rating);
    },
    [readonly, onChange]
  );

  const handleClearRating = useCallback(() => {
    setCurrentRating(0);
    setHoverRating(0);
    onClear?.();
    onChange?.(0);
  }, [onChange, onClear]);

  const displayRating = hoverRating || currentRating;

  const ratingLabel = useMemo(
    () => (displayRating > 0 ? getRatingLabel(displayRating) : null),
    [displayRating, getRatingLabel]
  );

  const stars = useMemo(
    () =>
      Array.from({ length: max }, (_, index) => {
        const rating = index + 1;
        return {
          rating,
          isFilled: rating <= displayRating,
        };
      }),
    [max, displayRating]
  );

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Label Section */}
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-black ${textStyles[size]}`}>
              {label}
            </span>
            {displayRating > 0 && (
              <span className={`text-gray-600 ${textStyles[size]}`}>
                ({displayRating}/{max})
              </span>
            )}
          </div>
          {clearable && currentRating > 0 && (
            <button
              onClick={handleClearRating}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              aria-label="Clear rating"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Star Rating */}
      <div
        className={`flex ${gapStyles[size]} ${
          readonly ? "" : "cursor-pointer"
        }`}
        role="radiogroup"
        aria-label={label}
      >
        {stars.map(({ rating, isFilled }) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRatingClick(rating)}
            onMouseEnter={() => !readonly && setHoverRating(rating)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            className={`
              transition-all duration-200 transform
              ${readonly ? "cursor-default" : "hover:scale-110 active:scale-95"}
              ${sizeStyles[size]}
            `}
            role="radio"
            aria-checked={rating === currentRating}
            aria-label={`${rating} star${rating !== 1 ? "s" : ""}`}
          >
            <svg
              className={`w-full h-full ${
                isFilled ? "text-yellow-400" : "text-gray-300"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Feedback Text */}
      {showFeedback && !readonly && displayRating > 0 && (
        <div
          className={`text-center text-gray-600 font-medium ${textStyles[size]}`}
        >
          {ratingLabel}
        </div>
      )}
    </div>
  );
}


// Usage Examples:

// import RatingInput from "@/components/RatingInput";
// import { Card, Button, Textarea, Select } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Basic Course Rating
// export function BasicCourseRating() {
//   const [rating, setRating] = useState(0);

//   const handleSubmitRating = () => {
//     console.log("Course rated:", rating);
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <Card variant="elevated">
//         <h3 className="text-lg font-semibold text-black mb-2">
//           React Fundamentals
//         </h3>
//         <p className="text-gray-600 mb-6">How would you rate this course?</p>

//         <RatingInput
//           value={rating}
//           onChange={setRating}
//           label="Course Rating"
//           showLabel={true}
//           showFeedback={true}
//         />

//         <Button
//           label="Submit Rating"
//           variant="primary"
//           onClick={handleSubmitRating}
//           className="mt-6 w-full"
//           disabled={rating === 0}
//         />
//       </Card>
//     </div>
//   );
// }

// // Example 2: Instructor Rating with Review
// export function InstructorRatingWithReview() {
//   const [instructorRating, setInstructorRating] = useState(0);
//   const [review, setReview] = useState("");

//   const handleSubmitReview = async () => {
//     if (!instructorRating || !review.trim()) return;

//     console.log("Review submitted:", {
//       rating: instructorRating,
//       review,
//     });
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <Card
//         variant="elevated"
//         header={<h3 className="text-lg font-semibold">Rate Your Instructor</h3>}
//       >
//         <div className="space-y-6">
//           <RatingInput
//             value={instructorRating}
//             onChange={setInstructorRating}
//             label="Instructor Quality"
//             max={5}
//             size="md"
//             clearable={true}
//           />

//           <Textarea
//             label="Your Review"
//             placeholder="Share your thoughts about the instructor..."
//             value={review}
//             onChange={(e) => setReview(e.target.value)}
//             rows={4}
//           />

//           <div className="flex gap-2">
//             <Button
//               label="Submit Review"
//               variant="primary"
//               onClick={handleSubmitReview}
//               disabled={!instructorRating || !review.trim()}
//               className="flex-1"
//             />
//             <Button label="Cancel" variant="outline" className="flex-1" />
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 3: Lesson Difficulty Rating
// export function LessonDifficultyRating() {
//   const [difficulty, setDifficulty] = useState(0);

//   return (
//     <div className="p-6 space-y-4">
//       <Card variant="outlined">
//         <h4 className="text-base font-semibold text-black mb-4">
//           Lesson: Advanced React Patterns
//         </h4>
//         <p className="text-gray-600 mb-6">
//           How difficult did you find this lesson?
//         </p>

//         <RatingInput
//           value={difficulty}
//           onChange={setDifficulty}
//           label="Difficulty Level"
//           max={5}
//           size="lg"
//           showFeedback={true}
//           clearable={true}
//         />
//       </Card>
//     </div>
//   );
// }

// // Example 4: Multiple Ratings Form
// export function MultipleRatingsForm() {
//   const [ratings, setRatings] = useState({
//     courseContent: 0,
//     instructorQuality: 0,
//     paceAndDifficulty: 0,
//     supportQuality: 0,
//   });

//   const handleSubmitAllRatings = () => {
//     console.log("All ratings submitted:", ratings);
//   };

//   const allRatingsComplete = Object.values(ratings).every((r) => r > 0);

//   return (
//     <div className="p-6 space-y-6">
//       <Card
//         variant="elevated"
//         header={<h3 className="text-xl font-semibold">Course Feedback</h3>}
//       >
//         <div className="space-y-8">
//           <RatingInput
//             value={ratings.courseContent}
//             onChange={(rating) =>
//               setRatings((prev) => ({ ...prev, courseContent: rating }))
//             }
//             label="Course Content Quality"
//             clearable={true}
//           />

//           <RatingInput
//             value={ratings.instructorQuality}
//             onChange={(rating) =>
//               setRatings((prev) => ({ ...prev, instructorQuality: rating }))
//             }
//             label="Instructor Quality"
//             clearable={true}
//           />

//           <RatingInput
//             value={ratings.paceAndDifficulty}
//             onChange={(rating) =>
//               setRatings((prev) => ({ ...prev, paceAndDifficulty: rating }))
//             }
//             label="Pace and Difficulty"
//             clearable={true}
//           />

//           <RatingInput
//             value={ratings.supportQuality}
//             onChange={(rating) =>
//               setRatings((prev) => ({ ...prev, supportQuality: rating }))
//             }
//             label="Support and Community"
//             clearable={true}
//           />

//           <Button
//             label="Submit All Ratings"
//             variant="primary"
//             onClick={handleSubmitAllRatings}
//             disabled={!allRatingsComplete}
//             className="w-full mt-6"
//           />
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 5: Read-only Rating Display
// export function ReadOnlyRatingDisplay() {
//   return (
//     <div className="p-6 space-y-4">
//       <Card variant="outlined">
//         <h3 className="text-lg font-semibold text-black mb-6">
//           Course Ratings
//         </h3>

//         <div className="space-y-6">
//           <RatingInput
//             value={4}
//             label="Average Rating"
//             readonly={true}
//             showFeedback={true}
//           />

//           <RatingInput
//             value={5}
//             label="Your Previous Rating"
//             readonly={true}
//             showFeedback={true}
//           />

//           <RatingInput
//             value={3}
//             label="Instructor Rating"
//             readonly={true}
//             showFeedback={false}
//             size="sm"
//           />
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 6: Different Sizes
// export function RatingSizes() {
//   return (
//     <div className="p-6 space-y-6">
//       <Card variant="elevated">
//         <h3 className="text-lg font-semibold text-black mb-6">Rating Sizes</h3>

//         <div className="space-y-8">
//           <RatingInput
//             value={4}
//             onChange={(r) => console.log("Small:", r)}
//             label="Small Rating"
//             size="sm"
//             showFeedback={true}
//           />

//           <RatingInput
//             value={5}
//             onChange={(r) => console.log("Medium:", r)}
//             label="Medium Rating"
//             size="md"
//             showFeedback={true}
//           />

//           <RatingInput
//             value={3}
//             onChange={(r) => console.log("Large:", r)}
//             label="Large Rating"
//             size="lg"
//             showFeedback={true}
//           />
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 7: Complete Rating Page
// export default function RatingInputDashboard() {
//   const [courseRating, setCourseRating] = useState(0);
//   const [instructorRating, setInstructorRating] = useState(0);
//   const [review, setReview] = useState("");
//   const [submitted, setSubmitted] = useState(false);

//   const handleSubmitRatings = async () => {
//     if (!courseRating || !instructorRating) return;

//     console.log("Ratings submitted:", {
//       courseRating,
//       instructorRating,
//       review,
//     });

//     setSubmitted(true);
//     setTimeout(() => {
//       setCourseRating(0);
//       setInstructorRating(0);
//       setReview("");
//       setSubmitted(false);
//     }, 3000);
//   };

//   if (submitted) {
//     return (
//       <div className="p-6">
//         <Card variant="elevated" className="text-center">
//           <div className="text-4xl mb-4">✨</div>
//           <h3 className="text-xl font-semibold text-black mb-2">Thank You!</h3>
//           <p className="text-gray-600">
//             Your feedback helps us improve our courses.
//           </p>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-2xl mx-auto">
//         {/* Header */}
//         <div className="mb-8 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Course Feedback
//           </h1>
//           <p className="text-gray-600">
//             Help us improve by rating your learning experience
//           </p>
//         </div>

//         {/* Course Info */}
//         <Card variant="elevated" className="mb-8">
//           <h2 className="text-2xl font-semibold text-black mb-2">
//             React Fundamentals
//           </h2>
//           <p className="text-gray-600">
//             Learn the basics of React including components, hooks, and state
//             management.
//           </p>
//         </Card>

//         {/* Rating Form */}
//         <Card variant="elevated" className="space-y-8">
//           {/* Course Rating */}
//           <div className="pb-6 border-b border-gray-200">
//             <RatingInput
//               value={courseRating}
//               onChange={setCourseRating}
//               label="How would you rate the course content?"
//               max={5}
//               size="md"
//               showFeedback={true}
//               clearable={true}
//             />
//           </div>

//           {/* Instructor Rating */}
//           <div className="pb-6 border-b border-gray-200">
//             <RatingInput
//               value={instructorRating}
//               onChange={setInstructorRating}
//               label="How would you rate the instructor?"
//               max={5}
//               size="md"
//               showFeedback={true}
//               clearable={true}
//             />
//           </div>

//           {/* Review */}
//           <Textarea
//             label="Additional Comments (Optional)"
//             placeholder="Share your thoughts, suggestions, or concerns..."
//             value={review}
//             onChange={(e) => setReview(e.target.value)}
//             rows={5}
//             maxLength={500}
//             showCharCount={true}
//           />

//           {/* Submit Button */}
//           <div className="flex gap-3 pt-4">
//             <Button
//               label="Submit Feedback"
//               variant="primary"
//               onClick={handleSubmitRatings}
//               disabled={!courseRating || !instructorRating}
//               className="flex-1"
//             />
//             <Button label="Skip" variant="outline" className="flex-1" />
//           </div>
//         </Card>

//         {/* Info Box */}
//         <Card variant="outlined" className="mt-8 bg-indigo-50">
//           <p className="text-sm text-gray-700">
//             💡 <strong>Your feedback matters:</strong> All reviews are read by
//             our team and used to continuously improve the quality of our courses
//             and teaching.
//           </p>
//         </Card>
//       </div>
//     </div>
//   );
// }