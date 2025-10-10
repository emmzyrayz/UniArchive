import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "outlined" | "elevated" | "flat" | "none";
  className?: string;
  onClick?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  children,
  variant = "flat",
  className = "",
  onClick,
  header,
  footer,
  hoverable = false,
  padding = "md",
}: CardProps) {
  const variantStyles = {
    outlined: "border-2 border-gray-200 bg-white",
    elevated: "shadow-lg bg-white",
    flat: "bg-white",
    none: "",
  };

  const paddingStyles = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };

  const hoverStyles = hoverable
    ? "hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
    : "";

  const clickableStyles = onClick ? "cursor-pointer active:scale-[0.98]" : "";

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl 
        ${paddingStyles[padding]}
        ${variantStyles[variant]} 
        ${hoverStyles} 
        ${clickableStyles}
        ${className}
      `}
    >
      {header && (
        <div className="mb-4 pb-3 border-b border-gray-100">{header}</div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-4 pt-3 border-t border-gray-100">{footer}</div>
      )}
    </div>
  );
}


// Usage example

// // Basic card
// <Card>
//   <h3>Welcome to the course!</h3>
//   <p>Start learning today</p>
// </Card>

// // With header and footer
// <Card
//   variant="outlined"
//   header={<h2 className="text-xl font-bold">Course Title</h2>}
//   footer={
//     <Button label="Enroll Now" variant="primary" />
//   }
// >
//   <p>This is an amazing course about web development...</p>
// </Card>

// // Clickable card with hover effect
// <Card
//   variant="elevated"
//   hoverable
//   onClick={() => navigate('/course/123')}
//   className="max-w-md"
// >
//   <h3 className="text-lg font-semibold mb-2">Introduction to React</h3>
//   <p className="text-gray-600">Learn the basics of React in this course</p>
// </Card>

// // Grid of course cards
// <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//   {courses.map((course) => (
//     <Card
//       key={course.id}
//       variant="outlined"
//       hoverable
//       onClick={() => viewCourse(course.id)}
//       header={
//         <img 
//           src={course.thumbnail} 
//           alt={course.title}
//           className="w-full h-40 object-cover rounded-t-lg -m-5 mb-0"
//         />
//       }
//       footer={
//         <div className="flex justify-between items-center">
//           <span className="text-sm text-gray-500">{course.duration}</span>
//           <Badge label={course.level} color="blue" />
//         </div>
//       }
//     >
//       <h3 className="font-bold text-lg mb-2">{course.title}</h3>
//       <p className="text-gray-600 text-sm">{course.description}</p>
//     </Card>
//   ))}
// </div>

// // Card with no padding (for images)
// <Card variant="elevated" padding="none">
//   <img src="/banner.jpg" alt="Banner" className="w-full rounded-t-xl" />
//   <div className="p-5">
//     <h3>Course Banner</h3>
//     <p>Description here</p>
//   </div>
// </Card>

// // Dashboard stats card
// <Card variant="elevated" className="text-center">
//   <div className="text-4xl font-bold text-indigo-600">1,234</div>
//   <div className="text-sm text-gray-500 mt-1">Total Students</div>
// </Card>