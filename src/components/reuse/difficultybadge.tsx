import { Badge } from "@/components/UI";
import { LuZap, LuFlame, LuRocket, LuCrown } from "react-icons/lu";

interface DifficultyBadgeProps {
  level: "beginner" | "intermediate" | "advanced" | "expert";
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "solid" | "outlined" | "soft";
}

export default function DifficultyBadge({
  level,
  showIcon = true,
  size = "md",
  className = "",
  variant = "soft",
}: DifficultyBadgeProps) {
  const levelConfig = {
    beginner: {
      label: "Beginner",
      color: "green" as const,
      icon: <LuZap className="w-3 h-3" />,
      description: "New to the topic",
    },
    intermediate: {
      label: "Intermediate",
      color: "yellow" as const,
      icon: <LuFlame className="w-3 h-3" />,
      description: "Some experience required",
    },
    advanced: {
      label: "Advanced",
      color: "red" as const,
      icon: <LuRocket className="w-3 h-3" />,
      description: "Strong foundation needed",
    },
    expert: {
      label: "Expert",
      color: "indigo" as const,
      icon: <LuCrown className="w-3 h-3" />,
      description: "Master level content",
    },
  };

  const config = levelConfig[level];

  return (
    <Badge
      label={config.label}
      color={config.color}
      variant={variant}
      size={size}
      icon={showIcon ? config.icon : undefined}
      className={`capitalize font-semibold ${className}`}
    />
  );
}

// Export helper function to get difficulty details
export const getDifficultyInfo = (level: DifficultyBadgeProps["level"]) => {
  const info = {
    beginner: {
      label: "Beginner",
      color: "green",
      description:
        "Perfect for those starting out. No prior experience needed.",
      prerequisites: "None",
      estimatedTime: "Short",
    },
    intermediate: {
      label: "Intermediate",
      color: "yellow",
      description: "Build on your foundation. Some experience recommended.",
      prerequisites: "Basic knowledge required",
      estimatedTime: "Medium",
    },
    advanced: {
      label: "Advanced",
      color: "red",
      description:
        "Dive deep into complex topics. Strong understanding needed.",
      prerequisites: "Solid foundation required",
      estimatedTime: "Long",
    },
    expert: {
      label: "Expert",
      color: "indigo",
      description: "Master level content for specialists and professionals.",
      prerequisites: "Expert level knowledge",
      estimatedTime: "Very Long",
    },
  };

  return info[level];
};


// 📖 Usage Examples:
// 1. Basic Usage
// tsx<DifficultyBadge level="beginner" />
// <DifficultyBadge level="intermediate" />
// <DifficultyBadge level="advanced" />
// <DifficultyBadge level="expert" />
// 2. Without Icons
// tsx<DifficultyBadge level="beginner" showIcon={false} />
// 3. Different Sizes
// tsx<DifficultyBadge level="advanced" size="sm" />
// <DifficultyBadge level="advanced" size="md" />
// <DifficultyBadge level="advanced" size="lg" />
// 4. Different Variants
// tsx<DifficultyBadge level="intermediate" variant="solid" />
// <DifficultyBadge level="intermediate" variant="outlined" />
// <DifficultyBadge level="intermediate" variant="soft" />
// 5. In Material/Course Cards
// tsx<Card>
//   <div className="flex justify-between items-start mb-3">
//     <h3 className="text-lg font-bold">Introduction to React</h3>
//     <DifficultyBadge level="beginner" size="sm" />
//   </div>
//   <p className="text-gray-600">Learn the basics of React...</p>
// </Card>
// 6. With Detailed Info
// tsximport { DifficultyBadge, getDifficultyInfo } from "@/components/complex";

// export default function CourseDetail({ course }) {
//   const difficultyInfo = getDifficultyInfo(course.difficulty);

//   return (
//     <div>
//       <div className="flex items-center gap-3 mb-4">
//         <DifficultyBadge level={course.difficulty} />
//         <span className="text-gray-600">{difficultyInfo.description}</span>
//       </div>

//       <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
//         <div>
//           <p className="text-sm text-gray-500">Prerequisites</p>
//           <p className="font-medium">{difficultyInfo.prerequisites}</p>
//         </div>
//         <div>
//           <p className="text-sm text-gray-500">Estimated Time</p>
//           <p className="font-medium">{difficultyInfo.estimatedTime}</p>
//         </div>
//       </div>
//     </div>
//   );
// }
// 7. Course Grid
// tsx<div className="grid grid-cols-3 gap-6">
//   {courses.map((course) => (
//     <Card key={course.id} hoverable>
//       <img src={course.thumbnail} alt={course.title} className="w-full h-40 object-cover rounded-t-lg -m-5 mb-3" />
      
//       <div className="flex items-center justify-between mb-2">
//         <DifficultyBadge level={course.difficulty} size="sm" />
//         <Badge label={`${course.duration}h`} color="gray" size="sm" />
//       </div>

//       <h3 className="font-bold mb-2">{course.title}</h3>
//       <p className="text-sm text-gray-600">{course.description}</p>
//     </Card>
//   ))}
// </div>
// 8. Filter by Difficulty
// tsxconst [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
// const difficulties: Array<"beginner" | "intermediate" | "advanced" | "expert"> = [
//   "beginner",
//   "intermediate", 
//   "advanced",
//   "expert"
// ];

// <div className="flex gap-2 mb-6">
//   <button
//     onClick={() => setSelectedDifficulty(null)}
//     className={`px-4 py-2 rounded-lg ${
//       !selectedDifficulty ? "bg-indigo-600 text-white" : "bg-gray-100"
//     }`}
//   >
//     All Levels
//   </button>
//   {difficulties.map((level) => (
//     <button
//       key={level}
//       onClick={() => setSelectedDifficulty(level)}
//       className={selectedDifficulty === level ? "ring-2 ring-indigo-600" : ""}
//     >
//       <DifficultyBadge level={level} />
//     </button>
//   ))}
// </div>
// 9. Material Detail Page
// tsx<TopContent
//   title={material.title}
//   subtitle={material.description}
//   badge={
//     <div className="flex gap-2">
//       <DifficultyBadge level={material.difficulty} />
//       <Badge label={material.category} color="blue" />
//       <Badge label={`${material.downloads} downloads`} color="gray" />
//     </div>
//   }
// />
// 10. Search Results
// tsx{searchResults.map((result) => (
//   <div key={result.id} className="flex items-center gap-4 p-4 border rounded-lg">
//     <div className="flex-1">
//       <h3 className="font-bold">{result.title}</h3>
//       <p className="text-sm text-gray-600">{result.description}</p>
//     </div>
//     <div className="flex flex-col gap-2 items-end">
//       <DifficultyBadge level={result.difficulty} size="sm" />
//       <span className="text-xs text-gray-500">{result.duration}</span>
//     </div>
//   </div>
// ))}
// 11. Course Comparison
// tsx<div className="grid grid-cols-3 gap-6">
//   {[course1, course2, course3].map((course) => (
//     <Card key={course.id}>
//       <h3 className="font-bold mb-4">{course.title}</h3>
      
//       <div className="space-y-3">
//         <div className="flex justify-between">
//           <span className="text-gray-600">Difficulty:</span>
//           <DifficultyBadge level={course.difficulty} size="sm" />
//         </div>
//         <div className="flex justify-between">
//           <span className="text-gray-600">Duration:</span>
//           <span className="font-medium">{course.duration}h</span>
//         </div>
//         <div className="flex justify-between">
//           <span className="text-gray-600">Students:</span>
//           <span className="font-medium">{course.students}</span>
//         </div>
//       </div>
//     </Card>
//   ))}
// </div>
// 🎨 Features:

// ✅ Four difficulty levels - Beginner, Intermediate, Advanced, Expert
// ✅ Semantic icons - Zap, Flame, Rocket, Crown
// ✅ Color-coded - Green, Yellow, Red, Indigo
// ✅ Three variants - Solid, Outlined, Soft
// ✅ Three sizes - sm, md, lg
// ✅ Helper function - Get detailed difficulty information
// ✅ Optional icons - Can hide icons
// ✅ Consistent styling - Matches your design system