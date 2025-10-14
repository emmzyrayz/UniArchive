import { ReactNode } from "react";
import { motion } from "framer-motion";

interface TopContentProps {
  title?: string;
  subtitle?: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  breadcrumbs?: ReactNode;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
  divider?: boolean;
}

export default function TopContent({
  title,
  subtitle,
  description,
  action,
  secondaryAction,
  icon,
  badge,
  breadcrumbs,
  align = "left",
  size = "md",
  animate = true,
  className = "",
  divider = true,
}: TopContentProps) {
  // Size variants
  const sizeStyles = {
    sm: {
      title: "text-xl md:text-2xl",
      subtitle: "text-sm",
      description: "text-sm",
      spacing: "py-4",
    },
    md: {
      title: "text-2xl md:text-3xl",
      subtitle: "text-base",
      description: "text-base",
      spacing: "py-6",
    },
    lg: {
      title: "text-3xl md:text-4xl",
      subtitle: "text-lg",
      description: "text-lg",
      spacing: "py-8",
    },
  };

  const styles = sizeStyles[size];

  // Alignment styles
  const alignmentStyles = {
    left: {
      container: "items-start md:items-center text-left",
      content: "items-start text-left",
    },
    center: {
      container: "items-center text-center",
      content: "items-center text-center",
    },
  };

  const alignment = alignmentStyles[align];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  const Content = animate ? motion.div : "div";
  const containerProps = animate
    ? {
        initial: "hidden",
        animate: "visible",
        variants: containerVariants,
      }
    : {};

  return (
    <Content
      {...containerProps}
      className={`flex flex-col ${styles.spacing} ${className}`}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <motion.div
          variants={animate ? itemVariants : undefined}
          className="mb-4"
        >
          {breadcrumbs}
        </motion.div>
      )}

      {/* Main Content */}
      <div
        className={`flex flex-col md:flex-row justify-between gap-4 w-full ${alignment.container}`}
      >
        {/* Left Side: Title, Subtitle, Description */}
        <motion.div
          variants={animate ? itemVariants : undefined}
          className={`flex flex-col gap-2 flex-1 ${alignment.content}`}
        >
          {/* Title Row with Icon and Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            {icon && (
              <div className="flex-shrink-0 text-indigo-600">{icon}</div>
            )}
            <h1 className={`${styles.title} font-bold text-black`}>{title}</h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className={`${styles.subtitle} text-gray-600 font-medium`}>
              {subtitle}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className={`${styles.description} text-gray-500 max-w-3xl`}>
              {description}
            </p>
          )}
        </motion.div>

        {/* Right Side: Actions */}
        {(action || secondaryAction) && (
          <motion.div
            variants={animate ? itemVariants : undefined}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0"
          >
            {secondaryAction && <div>{secondaryAction}</div>}
            {action && <div>{action}</div>}
          </motion.div>
        )}
      </div>

      {/* Divider */}
      {divider && (
        <motion.div
          variants={animate ? itemVariants : undefined}
          className="w-full h-px bg-gray-200 mt-4"
        />
      )}
    </Content>
  );
}

// Preset variants for common use cases
export const PageHeader = (props: Partial<TopContentProps>) => (
  <TopContent size="lg" {...props} />
);

export const SectionHeader = (props: Partial<TopContentProps>) => (
  <TopContent size="md" divider={false} {...props} />
);

export const CardHeader = (props: Partial<TopContentProps>) => (
  <TopContent size="sm" divider={false} animate={false} {...props} />
);


// Usae Example
// 1. Basic Usage
// tsx<TopContent
//   title="Recent Uploads"
//   subtitle="View all recently uploaded materials"
// />
// 2. With Action Button
// tsximport { Button } from "@/components/UI";
// import { LuPlus } from "react-icons/lu";

// <TopContent
//   title="My Materials"
//   subtitle="Manage your uploaded content"
//   action={
//     <Button 
//       label="Upload Material" 
//       icon={<LuPlus />}
//       onClick={() => router.push('/upload')}
//     />
//   }
// />
// 3. With Icon and Badge
// tsximport { Badge } from "@/components/UI";
// import { LuBook } from "react-icons/lu";

// <TopContent
//   title="Computer Science"
//   subtitle="Level 300 Course Materials"
//   icon={<LuBook className="h-8 w-8" />}
//   badge={<Badge label="24 Materials" color="indigo" />}
// />
// 4. With Description and Multiple Actions
// tsx<TopContent
//   title="Dashboard Overview"
//   subtitle="Welcome back, Emmanuel!"
//   description="Here's what's happening with your courses and materials this week."
//   action={<Button label="Upload New" variant="primary" />}
//   secondaryAction={<Button label="View Stats" variant="outline" />}
// />
// 5. With Breadcrumbs
// tsximport { Breadcrumbs } from "@/components/complex";

// <TopContent
//   title="Introduction to Algorithms"
//   subtitle="CS 301 - Fall 2024"
//   breadcrumbs={
//     <Breadcrumbs
//       items={[
//         { label: "Home", href: "/" },
//         { label: "Courses", href: "/courses" },
//         { label: "Computer Science", href: "/courses/cs" },
//         { label: "CS 301" },
//       ]}
//     />
//   }
// />
// 6. Center Aligned (Landing Pages)
// tsx<TopContent
//   title="Discover Knowledge"
//   subtitle="Access thousands of educational materials"
//   description="Join our community of learners and contributors sharing quality educational content."
//   align="center"
//   size="lg"
//   divider={false}
// />
// 7. Different Sizes
// tsx// Small (for cards/sections)
// <TopContent
//   title="Latest Materials"
//   size="sm"
//   action={<Button label="View All" variant="outline" size="sm" />}
// />

// // Medium (default, for main sections)
// <TopContent
//   title="Course Materials"
//   subtitle="Browse by category"
//   size="md"
// />

// // Large (for page headers)
// <TopContent
//   title="Welcome to EduShare"
//   subtitle="Your learning platform"
//   size="lg"
// />
// 8. Using Presets
// tsximport { PageHeader, SectionHeader, CardHeader } from "@/components/complex/TopContent";

// // Page header (large, with animation)
// <PageHeader
//   title="Dashboard"
//   subtitle="Overview of your activities"
//   action={<Button label="Settings" />}
// />

// // Section header (medium, no divider)
// <SectionHeader
//   title="Popular Courses"
//   action={<Button label="View All" variant="outline" />}
// />

// // Card header (small, no animation)
// <CardHeader
//   title="Quick Stats"
//   action={<Badge label="Live" color="green" />}
// />
// 9. Real-World Examples
// Dashboard Page:
// tsx<TopContent
//   title="Dashboard"
//   subtitle={`Welcome back, ${user.name}!`}
//   description="Here's your learning progress and recent activities."
//   icon={<LuGraduationCap className="h-8 w-8" />}
//   badge={<Badge label={`${user.level}`} color="indigo" />}
//   action={
//     <div className="flex gap-2">
//       <Button label="Upload" icon={<LuPlus />} />
//       <Button label="Profile" variant="outline" />
//     </div>
//   }
//   size="lg"
// />
// Course Materials Page:
// tsx<TopContent
//   title="Computer Science Materials"
//   subtitle="Level 300 • Semester 1"
//   description="Browse and download course materials shared by students and lecturers."
//   breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
//   icon={<LuCode className="h-7 w-7" />}
//   badge={<Badge label="156 Materials" color="blue" />}
//   action={
//     <SearchBar placeholder="Search materials..." />
//   }
//   secondaryAction={
//     <Button label="Filter" icon={<LuFilter />} variant="outline" />
//   }
// />
// Upload Page:
// tsx<TopContent
//   title="Upload Material"
//   subtitle="Share your notes, assignments, or resources"
//   description="Help your fellow students by contributing quality educational materials."
//   icon={<LuUpload className="h-7 w-7" />}
//   size="lg"
// />
// Material Detail Page:
// tsx<TopContent
//   title={material.title}
//   subtitle={`Uploaded by ${material.uploader.name} • ${material.date}`}
//   breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
//   badge={
//     <div className="flex gap-2">
//       <Badge label={material.category} color="indigo" />
//       <Badge label={material.level} color="blue" />
//     </div>
//   }
//   action={
//     <div className="flex gap-2">
//       <Button label="Download" icon={<LuDownload />} />
//       <Button label="Bookmark" icon={<LuBookmark />} variant="outline" />
//     </div>
//   }
// />
// 10. Without Animation (for server components)
// tsx<TopContent
//   title="Static Header"
//   subtitle="No animations"
//   animate={false}
// />


// 🎨 Features:

// ✅ Flexible sizing: sm, md, lg
// ✅ Animations: Smooth fade-in with stagger effect
// ✅ Icons & Badges: Support for visual elements
// ✅ Breadcrumbs: Navigation trail
// ✅ Multiple actions: Primary and secondary buttons
// ✅ Alignment: Left or center
// ✅ Responsive: Mobile-first design
// ✅ Optional divider: Clean section separation

// Ready for the next component? 🚀