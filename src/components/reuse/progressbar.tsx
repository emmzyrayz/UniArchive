// import { ReactElement } from "react";
import { Tooltip } from "@/components/UI";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "indigo";
  animated?: boolean;
  striped?: boolean;
  className?: string;
  variant?: "linear" | "circular";
  tooltipPosition?: "top" | "bottom" | "left" | "right";
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showLabel = true,
  showPercentage = true,
  size = "md",
  color = "indigo",
  animated = false,
  striped = false,
  className = "",
  variant = "linear",
  tooltipPosition = "top",
}: ProgressBarProps) {
  // Validate and clamp values
  const clampedValue = Math.min(Math.max(value, 0), max);
  const percentage = (clampedValue / max) * 100;
  const displayPercentage = Math.round(percentage);

  const sizeStyles = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const colorStyles = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-500",
    purple: "bg-purple-600",
    indigo: "bg-indigo-600",
  };

  const bgColorLight = {
    blue: "bg-blue-100",
    green: "bg-green-100",
    red: "bg-red-100",
    yellow: "bg-yellow-100",
    purple: "bg-purple-100",
    indigo: "bg-indigo-100",
  };

  const stripePattern = `linear-gradient(
    45deg,
    rgba(255,255,255,0.2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255,255,255,0.2) 50%,
    rgba(255,255,255,0.2) 75%,
    transparent 75%,
    transparent
  )`;

  // Linear Progress Bar
  const linearProgressBar = (
    <div
      className={`w-full ${bgColorLight[color]} rounded-full ${sizeStyles[size]} ${className} overflow-hidden`}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className={`
          ${colorStyles[color]}
          ${sizeStyles[size]}
          transition-all duration-500 ease-out
          ${animated ? "animate-pulse" : ""}
        `}
        style={{
          width: `${percentage}%`,
          backgroundImage: striped ? stripePattern : "none",
          backgroundSize: striped ? "40px 40px" : "auto",
          backgroundRepeat: striped ? "repeat" : "no-repeat",
        }}
      />
    </div>
  );

  // Circular Progress Bar
  const circleSize = {
    sm: 60,
    md: 80,
    lg: 100,
  }[size];

  const circleRadius = (circleSize - 8) / 2;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const circularProgressBar = (
    <div
      className="relative inline-flex items-center justify-center"
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <svg
        width={circleSize}
        height={circleSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={circleRadius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={circleRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`${
            colorStyles[color]
          } transition-all duration-500 ease-out ${
            animated ? "animate-pulse" : ""
          }`}
          strokeLinecap="round"
        />
      </svg>
      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-lg font-bold text-black">
            {displayPercentage}%
          </span>
        )}
        {label && showLabel && (
          <span className="text-xs text-gray-600 text-center whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
    </div>
  );

  const progressContent =
    variant === "circular" ? circularProgressBar : linearProgressBar;

  const content = (
    <div className={variant === "circular" ? "" : "space-y-2"}>
      {variant === "linear" && (showLabel || label) && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-black">
            {label || "Progress"}
          </span>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-600">
              {displayPercentage}%
            </span>
          )}
        </div>
      )}
      {progressContent}
    </div>
  );

  // Tooltip only for linear variant
  if (variant === "linear" && label && showLabel) {
    return (
      <Tooltip
        text={`${clampedValue}/${max} (${displayPercentage}%)`}
        position={tooltipPosition}
      >
        {content}
      </Tooltip>
    );
  }

  return content;
}


// Usage Examples 
// import ProgressBar from "@/components/ProgressBar";
// import { useState } from "react";
// import { Button } from "@/components/UI";

// // Example 1: Course Progress - Linear
// export function CourseProgressSection() {
//   return (
//     <div className="space-y-6 p-6">
//       <h2 className="text-2xl font-bold text-black">Your Progress</h2>

//       <ProgressBar
//         label="React Fundamentals"
//         value={65}
//         max={100}
//         color="indigo"
//         showPercentage={true}
//       />

//       <ProgressBar
//         label="TypeScript Advanced"
//         value={42}
//         max={100}
//         color="blue"
//       />

//       <ProgressBar label="Web Performance" value={89} max={100} color="green" />

//       <ProgressBar
//         label="Database Design"
//         value={15}
//         max={100}
//         color="yellow"
//       />
//     </div>
//   );
// }

// // Example 2: Assignment Submission Status
// export function AssignmentStatus() {
//   const assignments = [
//     {
//       id: 1,
//       name: "Assignment 1",
//       submitted: 45,
//       total: 50,
//       color: "green" as const,
//     },
//     {
//       id: 2,
//       name: "Assignment 2",
//       submitted: 30,
//       total: 50,
//       color: "yellow" as const,
//     },
//     {
//       id: 3,
//       name: "Assignment 3",
//       submitted: 5,
//       total: 50,
//       color: "red" as const,
//     },
//   ];

//   return (
//     <div className="space-y-6 p-6">
//       <h2 className="text-2xl font-bold text-black">Submission Status</h2>

//       {assignments.map((assignment) => (
//         <div key={assignment.id}>
//           <ProgressBar
//             label={assignment.name}
//             value={assignment.submitted}
//             max={assignment.total}
//             color={assignment.color}
//             size="md"
//           />
//         </div>
//       ))}
//     </div>
//   );
// }

// // Example 3: Circular Progress Bars
// export function CircularProgressExample() {
//   return (
//     <div className="p-6 space-y-8">
//       <h2 className="text-2xl font-bold text-black">Learning Statistics</h2>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//         <div className="flex flex-col items-center">
//           <ProgressBar
//             label="Lessons"
//             value={68}
//             max={100}
//             color="indigo"
//             variant="circular"
//             size="lg"
//           />
//           <p className="text-gray-600 mt-2 text-center">
//             68 out of 100 lessons completed
//           </p>
//         </div>

//         <div className="flex flex-col items-center">
//           <ProgressBar
//             label="Assignments"
//             value={82}
//             max={100}
//             color="green"
//             variant="circular"
//             size="lg"
//           />
//           <p className="text-gray-600 mt-2 text-center">
//             82 out of 100 assignments done
//           </p>
//         </div>

//         <div className="flex flex-col items-center">
//           <ProgressBar
//             label="Quizzes"
//             value={45}
//             max={100}
//             color="yellow"
//             variant="circular"
//             size="lg"
//           />
//           <p className="text-gray-600 mt-2 text-center">
//             45 out of 100 quizzes passed
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Example 4: Animated Progress Bar
// export function AnimatedProgressExample() {
//   const [uploadProgress, setUploadProgress] = useState(0);

//   const simulateUpload = () => {
//     setUploadProgress(0);
//     const interval = setInterval(() => {
//       setUploadProgress((prev) => {
//         if (prev >= 100) {
//           clearInterval(interval);
//           return 100;
//         }
//         return prev + Math.random() * 30;
//       });
//     }, 500);
//   };

//   return (
//     <div className="space-y-6 p-6">
//       <h2 className="text-2xl font-bold text-black">File Upload</h2>

//       <ProgressBar
//         label="Uploading course materials"
//         value={uploadProgress}
//         max={100}
//         color="indigo"
//         animated={uploadProgress < 100 && uploadProgress > 0}
//       />

//       <p className="text-gray-600">
//         {uploadProgress === 100
//           ? "Upload complete!"
//           : `Uploading... ${Math.round(uploadProgress)}%`}
//       </p>

//       <Button
//         label={uploadProgress === 100 ? "Upload Again" : "Start Upload"}
//         onClick={simulateUpload}
//         variant="primary"
//       />
//     </div>
//   );
// }

// // Example 5: Striped Progress Bars
// export function StripedProgressExample() {
//   return (
//     <div className="space-y-6 p-6">
//       <h2 className="text-2xl font-bold text-black">Course Modules</h2>

//       <div className="space-y-4">
//         <ProgressBar
//           label="Module 1: Basics"
//           value={100}
//           max={100}
//           color="green"
//           striped={true}
//         />

//         <ProgressBar
//           label="Module 2: Intermediate"
//           value={75}
//           max={100}
//           color="indigo"
//           striped={true}
//         />

//         <ProgressBar
//           label="Module 3: Advanced"
//           value={45}
//           max={100}
//           color="yellow"
//           striped={true}
//         />

//         <ProgressBar
//           label="Module 4: Expert"
//           value={10}
//           max={100}
//           color="red"
//           striped={true}
//         />
//       </div>
//     </div>
//   );
// }

// // Example 6: Different Sizes
// export function ProgressBarSizes() {
//   return (
//     <div className="space-y-6 p-6">
//       <h2 className="text-2xl font-bold text-black">Progress Bar Sizes</h2>

//       <div className="space-y-6">
//         <div>
//           <p className="text-sm text-gray-600 mb-2">Small</p>
//           <ProgressBar
//             label="Progress"
//             value={60}
//             max={100}
//             size="sm"
//             color="indigo"
//           />
//         </div>

//         <div>
//           <p className="text-sm text-gray-600 mb-2">Medium</p>
//           <ProgressBar
//             label="Progress"
//             value={60}
//             max={100}
//             size="md"
//             color="indigo"
//           />
//         </div>

//         <div>
//           <p className="text-sm text-gray-600 mb-2">Large</p>
//           <ProgressBar
//             label="Progress"
//             value={60}
//             max={100}
//             size="lg"
//             color="indigo"
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

// // Example 7: Complete Dashboard
// export default function ProgressBarDashboard() {
//   const [studentProgress, setStudentProgress] = useState({
//     react: 65,
//     typescript: 42,
//     performance: 89,
//     database: 15,
//   });

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="mb-8 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Learning Dashboard
//           </h1>
//           <p className="text-gray-600">
//             Track your course progress and achievements
//           </p>
//         </div>

//         {/* Overall Progress */}
//         <div className="mb-12">
//           <h2 className="text-2xl font-bold text-black mb-6">
//             Overall Progress
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//             <div className="flex flex-col items-center">
//               <ProgressBar
//                 label="React"
//                 value={studentProgress.react}
//                 max={100}
//                 variant="circular"
//                 color="indigo"
//                 size="md"
//               />
//             </div>
//             <div className="flex flex-col items-center">
//               <ProgressBar
//                 label="TypeScript"
//                 value={studentProgress.typescript}
//                 max={100}
//                 variant="circular"
//                 color="blue"
//                 size="md"
//               />
//             </div>
//             <div className="flex flex-col items-center">
//               <ProgressBar
//                 label="Performance"
//                 value={studentProgress.performance}
//                 max={100}
//                 variant="circular"
//                 color="green"
//                 size="md"
//               />
//             </div>
//             <div className="flex flex-col items-center">
//               <ProgressBar
//                 label="Database"
//                 value={studentProgress.database}
//                 max={100}
//                 variant="circular"
//                 color="yellow"
//                 size="md"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Detailed Course Progress */}
//         <div className="mb-12 border-t border-gray-200 pt-8">
//           <h2 className="text-2xl font-bold text-black mb-6">Course Modules</h2>
//           <div className="space-y-6">
//             <ProgressBar
//               label="Module 1: React Basics"
//               value={100}
//               max={100}
//               color="green"
//               size="lg"
//             />
//             <ProgressBar
//               label="Module 2: State Management"
//               value={75}
//               max={100}
//               color="indigo"
//               size="lg"
//             />
//             <ProgressBar
//               label="Module 3: Performance Optimization"
//               value={45}
//               max={100}
//               color="yellow"
//               size="lg"
//             />
//             <ProgressBar
//               label="Module 4: Advanced Patterns"
//               value={10}
//               max={100}
//               color="red"
//               size="lg"
//             />
//           </div>
//         </div>

//         {/* Statistics */}
//         <div className="border-t border-gray-200 pt-8">
//           <h2 className="text-2xl font-bold text-black mb-6">Statistics</h2>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
//             <div className="p-4 bg-indigo-50 rounded-lg">
//               <p className="text-2xl font-bold text-indigo-600">52.75%</p>
//               <p className="text-sm text-gray-600">Overall Progress</p>
//             </div>
//             <div className="p-4 bg-green-50 rounded-lg">
//               <p className="text-2xl font-bold text-green-600">230h</p>
//               <p className="text-sm text-gray-600">Learning Time</p>
//             </div>
//             <div className="p-4 bg-blue-50 rounded-lg">
//               <p className="text-2xl font-bold text-blue-600">12/15</p>
//               <p className="text-sm text-gray-600">Courses Active</p>
//             </div>
//             <div className="p-4 bg-yellow-50 rounded-lg">
//               <p className="text-2xl font-bold text-yellow-600">8</p>
//               <p className="text-sm text-gray-600">Day Streak</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }