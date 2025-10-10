import { ReactNode } from "react";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
  thickness?: number;
  color?: string;
  label?: string | ReactNode;
  labelPosition?: "left" | "center" | "right";
  variant?: "solid" | "dashed" | "dotted";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  gradient?: boolean;
}

export default function Divider({
  orientation = "horizontal",
  className = "",
  thickness = 1,
  color = "#e5e7eb",
  label,
  labelPosition = "center",
  variant = "solid",
  spacing = "md",
  gradient = false,
}: DividerProps) {
  // Spacing classes
  const spacingClasses = {
    none: "",
    sm: orientation === "horizontal" ? "my-2" : "mx-2",
    md: orientation === "horizontal" ? "my-4" : "mx-4",
    lg: orientation === "horizontal" ? "my-6" : "mx-6",
    xl: orientation === "horizontal" ? "my-8" : "mx-8",
  }[spacing];

  // Border style based on variant
  const borderStyle = {
    solid: "solid",
    dashed: "dashed",
    dotted: "dotted",
  }[variant];

  const getBorderStyles = () => {
    const baseStyle = {
      borderStyle,
      borderColor: color,
    };

    if (gradient && color === "#e5e7eb") {
      return {
        ...baseStyle,
        background: "linear-gradient(90deg, transparent, #e5e7eb, transparent)",
        border: "none",
      };
    }

    if (gradient && color !== "#e5e7eb") {
      return {
        ...baseStyle,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        border: "none",
      };
    }

    return baseStyle;
  };

  // Vertical Divider
  if (orientation === "vertical") {
    return (
      <div
        className={`inline-block h-full ${spacingClasses} ${className}`}
        style={{
          width: thickness,
          borderLeftWidth: thickness,
          ...getBorderStyles(),
        }}
        aria-orientation="vertical"
        role="separator"
      />
    );
  }

  // Horizontal Divider without label
  if (!label) {
    return (
      <div
        className={`w-full ${spacingClasses} ${className}`}
        style={{
          height: thickness,
          borderBottomWidth: thickness,
          ...getBorderStyles(),
        }}
        aria-orientation="horizontal"
        role="separator"
      />
    );
  }

  // Horizontal Divider with label
  const getLabelAlignment = () => {
    const alignment = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
    }[labelPosition];

    return alignment;
  };

  const getLineVisibility = () => {
    if (labelPosition === "left") {
      return { leftLine: false, rightLine: true };
    }
    if (labelPosition === "right") {
      return { leftLine: true, rightLine: false };
    }
    return { leftLine: true, rightLine: true };
  };

  const { leftLine, rightLine } = getLineVisibility();

  return (
    <div
      className={`flex items-center w-full ${spacingClasses} ${getLabelAlignment()} ${className}`}
      role="separator"
      aria-orientation="horizontal"
    >
      {leftLine && (
        <div
          className="flex-grow"
          style={{
            height: thickness,
            borderBottomWidth: thickness,
            ...getBorderStyles(),
          }}
        />
      )}

      <div className="px-3 flex items-center gap-2">
        {typeof label === "string" ? (
          <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
            {label}
          </span>
        ) : (
          label
        )}
      </div>

      {rightLine && (
        <div
          className="flex-grow"
          style={{
            height: thickness,
            borderBottomWidth: thickness,
            ...getBorderStyles(),
          }}
        />
      )}
    </div>
  );
}


// Usage Example

// import Divider from "./divider";
// import {
//   FiBook,
//   FiVideo,
//   FiAward,
//   FiClock,
//   FiUser,
//   FiBarChart2,
//   FiStar,
//   FiCheckCircle,
// } from "react-icons/fi";

// export default function DividerExamples() {
//   return (
//     <div className="p-6 space-y-8 bg-white max-w-4xl mx-auto">
//       {/* Course Content Sections */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Course Sections</h2>
//         <div className="space-y-6">
//           <div>
//             <h3 className="text-lg font-semibold text-gray-900">
//               Introduction to React
//             </h3>
//             <p className="text-gray-600 mt-1">
//               Learn the fundamentals of React programming
//             </p>
//           </div>

//           <Divider variant="dashed" color="#e5e7eb" spacing="lg" />

//           <div>
//             <h3 className="text-lg font-semibold text-gray-900">
//               Advanced Concepts
//             </h3>
//             <p className="text-gray-600 mt-1">
//               Dive deeper into state management and hooks
//             </p>
//           </div>

//           <Divider
//             label="Up Next"
//             labelPosition="left"
//             color="#6366f1"
//             thickness={2}
//             spacing="lg"
//           />

//           <div>
//             <h3 className="text-lg font-semibold text-gray-900">
//               Project Building
//             </h3>
//             <p className="text-gray-600 mt-1">
//               Apply your knowledge to real-world projects
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Course Statistics with Icon Labels */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Course Statistics</h2>
//         <div className="grid grid-cols-3 gap-4 text-center">
//           <div>
//             <div className="text-2xl font-bold text-indigo-600">24</div>
//             <div className="text-sm text-gray-600">Lessons</div>
//           </div>

//           <Divider
//             orientation="vertical"
//             thickness={2}
//             color="#d1d5db"
//             spacing="none"
//           />

//           <div>
//             <div className="text-2xl font-bold text-green-600">18</div>
//             <div className="text-sm text-gray-600">Completed</div>
//           </div>

//           <Divider
//             orientation="vertical"
//             thickness={2}
//             color="#d1d5db"
//             spacing="none"
//           />

//           <div>
//             <div className="text-2xl font-bold text-blue-600">6</div>
//             <div className="text-sm text-gray-600">Remaining</div>
//           </div>
//         </div>
//       </div>

//       {/* Module Progress */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Module Progress</h2>
//         <div className="space-y-4">
//           <div className="flex justify-between items-center">
//             <span className="text-gray-700">Basic Concepts</span>
//             <FiCheckCircle className="text-green-500" />
//           </div>

//           <Divider variant="dotted" thickness={2} spacing="sm" />

//           <div className="flex justify-between items-center">
//             <span className="text-gray-700">State Management</span>
//             <FiCheckCircle className="text-green-500" />
//           </div>

//           <Divider variant="dotted" thickness={2} spacing="sm" />

//           <div className="flex justify-between items-center">
//             <span className="text-gray-700">Advanced Hooks</span>
//             <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
//           </div>
//         </div>
//       </div>

//       {/* Rich Label Dividers */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">
//           Section Dividers with Icons
//         </h2>
//         <div className="space-y-6">
//           <Divider
//             label={
//               <div className="flex items-center gap-2 text-indigo-600">
//                 <FiVideo size={16} />
//                 <span className="font-semibold">Video Lectures</span>
//               </div>
//             }
//             color="#6366f1"
//             thickness={1}
//             variant="solid"
//           />

//           <Divider
//             label={
//               <div className="flex items-center gap-2 text-green-600">
//                 <FiBook size={16} />
//                 <span className="font-semibold">Reading Materials</span>
//               </div>
//             }
//             labelPosition="left"
//             color="#10b981"
//             thickness={1}
//           />

//           <Divider
//             label={
//               <div className="flex items-center gap-2 text-yellow-600">
//                 <FiAward size={16} />
//                 <span className="font-semibold">Assignments & Projects</span>
//               </div>
//             }
//             labelPosition="right"
//             color="#f59e0b"
//             thickness={1}
//           />
//         </div>
//       </div>

//       {/* Student Dashboard Layout */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Dashboard Layout</h2>
//         <div className="flex border border-gray-200 rounded-lg p-4">
//           {/* Sidebar */}
//           <div className="w-48 space-y-4">
//             <div className="text-sm font-medium text-gray-900">Navigation</div>
//             <nav className="space-y-2">
//               <div className="text-gray-700 hover:text-indigo-600 cursor-pointer">
//                 My Courses
//               </div>
//               <div className="text-gray-700 hover:text-indigo-600 cursor-pointer">
//                 Progress
//               </div>
//               <div className="text-gray-700 hover:text-indigo-600 cursor-pointer">
//                 Certificates
//               </div>
//             </nav>
//           </div>

//           <Divider
//             orientation="vertical"
//             thickness={2}
//             color="#e5e7eb"
//             spacing="md"
//             variant="dashed"
//           />

//           {/* Main Content */}
//           <div className="flex-1 pl-6">
//             <h3 className="text-lg font-semibold text-gray-900">
//               Recent Activity
//             </h3>
//             <p className="text-gray-600 mt-2">
//               Your learning progress and achievements
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Course Difficulty Levels */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Difficulty Levels</h2>
//         <div className="space-y-4">
//           <Divider
//             label="Beginner Friendly"
//             labelPosition="center"
//             color="#10b981"
//             thickness={3}
//             gradient={true}
//           />

//           <div className="text-center text-sm text-gray-600">
//             Perfect for those starting their programming journey
//           </div>

//           <Divider
//             label="Intermediate Level"
//             labelPosition="center"
//             color="#f59e0b"
//             thickness={3}
//             gradient={true}
//           />

//           <div className="text-center text-sm text-gray-600">
//             Requires basic programming knowledge
//           </div>

//           <Divider
//             label="Advanced Concepts"
//             labelPosition="center"
//             color="#ef4444"
//             thickness={3}
//             gradient={true}
//           />

//           <div className="text-center text-sm text-gray-600">
//             For experienced developers looking to deepen their skills
//           </div>
//         </div>
//       </div>

//       {/* Assignment Submission Status */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Assignment Timeline</h2>
//         <div className="flex items-center justify-between">
//           <div className="text-center">
//             <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto">
//               <FiCheckCircle className="text-white" size={16} />
//             </div>
//             <div className="text-xs mt-1 text-gray-600">Submitted</div>
//           </div>

//           <Divider
//             thickness={2}
//             color="#10b981"
//             spacing="none"
//             className="flex-1 mx-4"
//           />

//           <div className="text-center">
//             <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
//               <FiBarChart2 className="text-white" size={16} />
//             </div>
//             <div className="text-xs mt-1 text-gray-600">Grading</div>
//           </div>

//           <Divider
//             thickness={2}
//             color="#d1d5db"
//             variant="dashed"
//             spacing="none"
//             className="flex-1 mx-4"
//           />

//           <div className="text-center">
//             <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mx-auto">
//               <FiAward className="text-gray-500" size={16} />
//             </div>
//             <div className="text-xs mt-1 text-gray-600">Completed</div>
//           </div>
//         </div>
//       </div>

//       {/* Variant Showcase */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Divider Variants</h2>
//         <div className="space-y-6">
//           <Divider variant="solid" label="Solid" thickness={2} />
//           <Divider variant="dashed" label="Dashed" thickness={2} />
//           <Divider variant="dotted" label="Dotted" thickness={2} />
//           <Divider
//             gradient={true}
//             label="Gradient"
//             thickness={3}
//             color="#6366f1"
//           />
//         </div>
//       </div>
//     </div>
//   );
// }