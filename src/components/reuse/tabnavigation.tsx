import { ReactElement, useMemo, useCallback } from "react";
import { Badge } from "@/components/UI";

interface TabItem {
  id: string;
  label: string;
  icon?: ReactElement;
  badge?: number | string;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "underline" | "pills" | "segmented";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
  scrollable?: boolean;
}

const VARIANT_STYLES = {
  underline: {
    container: "border-b border-gray-200 flex overflow-x-auto",
    tab: {
      base: "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200",
      active: "border-indigo-500 text-indigo-600",
      inactive:
        "border-transparent text-gray-600 hover:text-black hover:border-gray-300",
      disabled: "text-gray-400 cursor-not-allowed",
    },
  },
  pills: {
    container: "flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto",
    tab: {
      base: "px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 whitespace-nowrap",
      active: "bg-white text-black shadow-sm",
      inactive: "text-gray-700 hover:text-black hover:bg-gray-200",
      disabled: "text-gray-400 cursor-not-allowed bg-transparent",
    },
  },
  segmented: {
    container:
      "inline-flex gap-1 rounded-lg border border-gray-300 p-1 overflow-x-auto",
    tab: {
      base: "px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 whitespace-nowrap",
      active: "bg-indigo-600 text-white",
      inactive: "text-gray-700 hover:text-black hover:bg-gray-100",
      disabled: "text-gray-400 cursor-not-allowed bg-transparent",
    },
  },
};

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant = "underline",
  fullWidth = false,
  className = "",
  scrollable = true,
}: TabNavigationProps) {
  const handleTabChange = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab && !tab.disabled) {
        onTabChange(tabId);
      }
    },
    [tabs, onTabChange]
  );

  const currentVariant = useMemo(() => VARIANT_STYLES[variant], [variant]);

  const containerClasses = useMemo(() => {
    const baseClasses = `flex ${currentVariant.container}`;
    const widthClass = fullWidth ? "w-full" : "";
    const overflowClass = scrollable && !fullWidth ? "overflow-x-auto" : "";
    return `${baseClasses} ${widthClass} ${overflowClass}`.trim();
  }, [currentVariant, fullWidth, scrollable]);

  return (
    <nav className={className} role="tablist">
      <div className={containerClasses}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          const tabClasses = `
            flex items-center gap-2
            ${currentVariant.tab.base}
            ${
              isDisabled
                ? currentVariant.tab.disabled
                : isActive
                ? currentVariant.tab.active
                : currentVariant.tab.inactive
            }
            ${fullWidth ? "flex-1 justify-center" : ""}
          `.trim();

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={isDisabled}
              className={tabClasses}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              tabIndex={isActive ? 0 : -1}
            >
              {tab.icon && (
                <span
                  className="flex-shrink-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge
                  label={tab.badge}
                  size="sm"
                  color={isActive ? "indigo" : "gray"}
                  variant="soft"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}


// Usage Examples:
// import TabNavigation from "@/components/TabNavigation";
// import { Card } from "@/components/UI";
// import { useState } from "react";
// import {
//   LuBook,
//   LuFileText,
//   LuSettings,
//   LuUsers,
//   LuBarChart3,
//   LuAward,
// } from "react-icons/lu";

// // Example 1: Course Sections Navigation
// export function CourseTabsExample() {
//   const [activeTab, setActiveTab] = useState("overview");

//   const tabs = [
//     { id: "overview", label: "Overview", icon: <LuBook size={18} /> },
//     {
//       id: "content",
//       label: "Content",
//       icon: <LuFileText size={18} />,
//       badge: 12,
//     },
//     {
//       id: "assignments",
//       label: "Assignments",
//       icon: <LuBarChart3 size={18} />,
//       badge: 5,
//     },
//     {
//       id: "discussion",
//       label: "Discussion",
//       icon: <LuUsers size={18} />,
//       badge: 3,
//     },
//     { id: "certificates", label: "Certificates", icon: <LuAward size={18} /> },
//   ];

//   const renderContent = () => {
//     const content: Record<string, string> = {
//       overview: "Course overview and introduction...",
//       content: "Lesson content and materials...",
//       assignments: "View and manage assignments...",
//       discussion: "Community discussions...",
//       certificates: "View your certificates...",
//     };
//     return content[activeTab];
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">Course Dashboard</h2>
//         <p className="text-gray-600">Navigate through course sections</p>
//       </div>

//       <TabNavigation
//         tabs={tabs}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         variant="underline"
//         fullWidth={false}
//       />

//       <Card variant="elevated" className="p-6 min-h-32">
//         <p className="text-gray-700">{renderContent()}</p>
//       </Card>
//     </div>
//   );
// }

// // Example 2: Pills Variant
// export function PillsTabsExample() {
//   const [activeTab, setActiveTab] = useState("active");

//   const tabs = [
//     { id: "active", label: "Active Courses", badge: 3 },
//     { id: "completed", label: "Completed", badge: 12 },
//     { id: "wishlist", label: "Wishlist", badge: 5 },
//     { id: "archived", label: "Archived" },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">My Learning</h2>

//       <TabNavigation
//         tabs={tabs}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         variant="pills"
//         size="md"
//       />

//       <Card variant="outlined" className="p-6">
//         <p className="text-gray-600">Showing {activeTab} courses...</p>
//       </Card>
//     </div>
//   );
// }

// // Example 3: Segmented Variant
// export function SegmentedTabsExample() {
//   const [activeTab, setActiveTab] = useState("monthly");

//   const tabs = [
//     { id: "weekly", label: "Weekly" },
//     { id: "monthly", label: "Monthly" },
//     { id: "yearly", label: "Yearly" },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Analytics</h2>

//       <TabNavigation
//         tabs={tabs}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         variant="segmented"
//         size="sm"
//       />

//       <Card
//         variant="elevated"
//         className="p-6 h-48 flex items-center justify-center"
//       >
//         <p className="text-gray-600">
//           {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} analytics
//           chart...
//         </p>
//       </Card>
//     </div>
//   );
// }

// // Example 4: With Disabled Tabs
// export function DisabledTabsExample() {
//   const [activeTab, setActiveTab] = useState("lessons");

//   const tabs = [
//     { id: "lessons", label: "Lessons", icon: <LuBook size={18} /> },
//     {
//       id: "quiz",
//       label: "Quiz",
//       icon: <LuFileText size={18} />,
//       disabled: true,
//     },
//     {
//       id: "project",
//       label: "Project",
//       icon: <LuBarChart3 size={18} />,
//       disabled: true,
//     },
//     { id: "feedback", label: "Feedback", icon: <LuUsers size={18} /> },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">Lesson Progress</h2>
//         <p className="text-gray-600 text-sm">
//           Complete lessons to unlock quiz and project sections
//         </p>
//       </div>

//       <TabNavigation
//         tabs={tabs}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         variant="pills"
//       />

//       <Card variant="outlined" className="p-6">
//         <p className="text-gray-700">
//           {activeTab === "lessons"
//             ? "Viewing lesson content..."
//             : activeTab === "feedback"
//             ? "Viewing feedback..."
//             : "Coming soon..."}
//         </p>
//       </Card>
//     </div>
//   );
// }

// // Example 5: Full Width Tabs
// export function FullWidthTabsExample() {
//   const [activeTab, setActiveTab] = useState("profile");

//   const tabs = [
//     { id: "profile", label: "Profile" },
//     { id: "learning", label: "Learning Path" },
//     { id: "settings", label: "Settings" },
//     { id: "help", label: "Help" },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black mb-4">Account</h2>

//       <TabNavigation
//         tabs={tabs}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         variant="segmented"
//         fullWidth={true}
//       />

//       <Card variant="elevated" className="p-6">
//         <p className="text-gray-700 capitalize">
//           {activeTab} section content...
//         </p>
//       </Card>
//     </div>
//   );
// }

// // Example 6: Complete Dashboard
// export default function TabNavigationDashboard() {
//   const [courseTab, setCourseTab] = useState("overview");
//   const [statsTab, setStatsTab] = useState("weekly");

//   const courseTabs = [
//     { id: "overview", label: "Overview", icon: <LuBook size={18} /> },
//     {
//       id: "lectures",
//       label: "Lectures",
//       icon: <LuFileText size={18} />,
//       badge: 24,
//     },
//     {
//       id: "assignments",
//       label: "Assignments",
//       icon: <LuBarChart3 size={18} />,
//       badge: 5,
//     },
//     {
//       id: "students",
//       label: "Students",
//       icon: <LuUsers size={18} />,
//       badge: 145,
//     },
//     {
//       id: "settings",
//       label: "Settings",
//       icon: <LuSettings size={18} />,
//     },
//   ];

//   const statsTabs = [
//     { id: "weekly", label: "Week" },
//     { id: "monthly", label: "Month" },
//     { id: "yearly", label: "Year" },
//   ];

//   return (
//     <div className="bg-gray-50 min-h-screen p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="mb-12">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Instructor Dashboard
//           </h1>
//           <p className="text-gray-600">
//             Manage your courses and track student progress
//           </p>
//         </div>

//         {/* Course Section */}
//         <div className="mb-12">
//           <h2 className="text-2xl font-bold text-black mb-6">
//             React Fundamentals Course
//           </h2>

//           <Card variant="elevated" className="p-6 space-y-6">
//             <TabNavigation
//               tabs={courseTabs}
//               activeTab={courseTab}
//               onTabChange={setCourseTab}
//               variant="underline"
//               scrollable={true}
//             />

//             <div className="min-h-40 bg-gray-50 rounded-lg p-6">
//               <p className="text-gray-700 capitalize">
//                 {courseTab} content for React Fundamentals course...
//               </p>
//             </div>
//           </Card>
//         </div>

//         {/* Analytics Section */}
//         <div>
//           <h2 className="text-2xl font-bold text-black mb-6">
//             Course Analytics
//           </h2>

//           <Card variant="elevated" className="p-6 space-y-6">
//             <TabNavigation
//               tabs={statsTabs}
//               activeTab={statsTab}
//               onTabChange={setStatsTab}
//               variant="pills"
//               fullWidth={false}
//             />

//             <div className="h-64 bg-gradient-to-b from-indigo-50 to-blue-50 rounded-lg flex items-center justify-center">
//               <p className="text-gray-600">
//                 {statsTab} analytics chart for student engagement...
//               </p>
//             </div>
//           </Card>
//         </div>

//         {/* Tab Variants Reference */}
//         <div className="mt-12 grid md:grid-cols-3 gap-6">
//           <Card variant="outlined" className="p-4">
//             <h3 className="font-semibold text-black mb-3">Underline</h3>
//             <p className="text-sm text-gray-600">
//               Classic underline style, best for top-level navigation
//             </p>
//           </Card>

//           <Card variant="outlined" className="p-4">
//             <h3 className="font-semibold text-black mb-3">Pills</h3>
//             <p className="text-sm text-gray-600">
//               Pill-style tabs with background, good for filtering
//             </p>
//           </Card>

//           <Card variant="outlined" className="p-4">
//             <h3 className="font-semibold text-black mb-3">Segmented</h3>
//             <p className="text-sm text-gray-600">
//               Segmented control style, ideal for options
//             </p>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }