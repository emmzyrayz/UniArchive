"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, Button, Input, Checkbox, Select } from "@/components/UI";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSection {
  id: string;
  title: string;
  type: "checkbox" | "radio" | "range" | "search";
  options: FilterOption[];
  multiple?: boolean;
  collapsible?: boolean;
}

interface FilterPanelProps {
  sections: FilterSection[];
  values: Record<string, string | string[]>;
  onChange: (filters: Record<string, string | string[]>) => void;
  onReset?: () => void;
  onApply?: () => void;
  title?: string;
  className?: string;
  autoApply?: boolean;
  showActiveCount?: boolean;
}

export default function FilterPanel({
  sections,
  values,
  onChange,
  onReset,
  onApply,
  title = "Filters",
  className = "",
  autoApply = false,
  showActiveCount = true,
}: FilterPanelProps) {
  const [localValues, setLocalValues] = useState(values);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );

  const handleCheckboxChange = useCallback(
    (sectionId: string, optionValue: string, checked: boolean) => {
      setLocalValues((prev) => {
        const currentValues = (prev[sectionId] as string[]) || [];
        const newValues = checked
          ? [...currentValues, optionValue]
          : currentValues.filter((v) => v !== optionValue);

        const updated = { ...prev, [sectionId]: newValues };
        if (autoApply) onChange(updated);
        return updated;
      });
    },
    [autoApply, onChange]
  );

  const handleRadioChange = useCallback(
    (sectionId: string, optionValue: string) => {
      setLocalValues((prev) => {
        const updated = { ...prev, [sectionId]: optionValue };
        if (autoApply) onChange(updated);
        return updated;
      });
    },
    [autoApply, onChange]
  );

  const handleSearchChange = useCallback(
    (sectionId: string, searchValue: string) => {
      setLocalValues((prev) => {
        const updated = { ...prev, [sectionId]: searchValue };
        if (autoApply) onChange(updated);
        return updated;
      });
    },
    [autoApply, onChange]
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const handleApply = useCallback(() => {
    onChange(localValues);
    onApply?.();
  }, [localValues, onChange, onApply]);

  const handleReset = useCallback(() => {
    const resetValues: Record<string, string | string[]> = {};
    sections.forEach((section) => {
      resetValues[section.id] = section.multiple ? [] : "";
    });

    setLocalValues(resetValues);
    onChange(resetValues);
    onReset?.();
  }, [sections, onChange, onReset]);

  const getSelectedCount = useCallback(
    (sectionId: string): number => {
      const value = localValues[sectionId];
      if (Array.isArray(value)) {
        return value.length;
      }
      return value ? 1 : 0;
    },
    [localValues]
  );

  const totalActiveFilters = useMemo(() => {
    return Object.entries(localValues).reduce((count, [ value]) => {
      if (Array.isArray(value)) {
        return count + value.length;
      }
      return count + (value ? 1 : 0);
    }, 0);
  }, [localValues]);

  const hasActiveFilters = totalActiveFilters > 0;

  return (
    <Card variant="elevated" padding="md" className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          {showActiveCount && hasActiveFilters && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              {totalActiveFilters}
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className="text-sm text-indigo-600 hover:text-indigo-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          aria-label="Reset all filters"
        >
          Reset All
        </button>
      </div>

      {/* Filter Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const sectionActive = getSelectedCount(section.id) > 0;

          return (
            <div
              key={section.id}
              className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0"
            >
              {/* Section Header */}
              {section.collapsible ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between mb-3 hover:text-indigo-600 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black">
                      {section.title}
                    </span>
                    {sectionActive && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                        {getSelectedCount(section.id)}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-black">{section.title}</h4>
                  {section.multiple && sectionActive && (
                    <span className="text-xs text-gray-500">
                      {getSelectedCount(section.id)} selected
                    </span>
                  )}
                </div>
              )}

              {/* Section Content */}
              {(!section.collapsible || isExpanded) && (
                <div className="space-y-2">
                  {section.type === "search" && (
                    <Input
                      name={`search-${section.id}`}
                      placeholder={`Search ${section.title.toLowerCase()}...`}
                      value={(localValues[section.id] as string) || ""}
                      onChange={(e) =>
                        handleSearchChange(section.id, e.target.value)
                      }
                    />
                  )}

                  {(section.type === "checkbox" ||
                    section.type === "radio") && (
                    <div className="space-y-2">
                      {section.options.map((option) => {
                        const isChecked =
                          section.type === "checkbox"
                            ? (localValues[section.id] as string[])?.includes(
                                option.value
                              ) || false
                            : localValues[section.id] === option.value;

                        return (
                          <div
                            key={option.value}
                            className="flex items-center justify-between group"
                          >
                            <Checkbox
                              label={option.label}
                              checked={isChecked}
                              onChange={(e) => {
                                if (section.type === "checkbox") {
                                  handleCheckboxChange(
                                    section.id,
                                    option.value,
                                    e.target.checked
                                  );
                                } else {
                                  handleRadioChange(section.id, option.value);
                                }
                              }}
                            />
                            {option.count !== undefined && (
                              <span className="text-xs text-gray-500 group-hover:text-gray-700">
                                ({option.count})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {section.type === "range" && (
                    <Select
                      name={`range-${section.id}`}
                      options={section.options}
                      value={localValues[section.id] as string}
                      onChange={(e) =>
                        handleRadioChange(section.id, e.target.value)
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-2 flex flex-col">
        <Button
          variant="primary"
          label="Apply Filters"
          onClick={handleApply}
          className="w-full"
          disabled={!hasActiveFilters && !autoApply}
        />
        {hasActiveFilters && (
          <Button
            variant="outline"
            label="Clear All"
            onClick={handleReset}
            className="w-full"
          />
        )}
      </div>
    </Card>
  );
}


// Usage Examples:

// "use client";

// import { useState } from "react";
// import FilterPanel from "@/components/FilterPanel";
// import { Card, Badge } from "@/components/UI";

// // Example 1: Course Filter Panel
// export function CourseFilterPanel() {
//   const [filters, setFilters] = useState({
//     level: [],
//     category: [],
//     duration: "",
//     rating: [],
//   });

//   const filterSections = [
//     {
//       id: "level",
//       title: "Level",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "beginner", label: "Beginner", count: 45 },
//         { value: "intermediate", label: "Intermediate", count: 32 },
//         { value: "advanced", label: "Advanced", count: 18 },
//       ],
//     },
//     {
//       id: "category",
//       title: "Category",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "web", label: "Web Development", count: 28 },
//         { value: "mobile", label: "Mobile Development", count: 22 },
//         { value: "backend", label: "Backend", count: 19 },
//         { value: "devops", label: "DevOps", count: 15 },
//       ],
//     },
//     {
//       id: "duration",
//       title: "Duration",
//       type: "range" as const,
//       options: [
//         { value: "", label: "Any" },
//         { value: "short", label: "Short (0-5 hours)" },
//         { value: "medium", label: "Medium (5-20 hours)" },
//         { value: "long", label: "Long (20+ hours)" },
//       ],
//     },
//     {
//       id: "rating",
//       title: "Rating",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "5", label: "5 Stars", count: 42 },
//         { value: "4", label: "4+ Stars", count: 68 },
//         { value: "3", label: "3+ Stars", count: 85 },
//       ],
//     },
//   ];

//   const handleFilterChange = (
//     newFilters: Record<string, string | string[]>
//   ) => {
//     setFilters(newFilters);
//     console.log("Filters applied:", newFilters);
//   };

//   const handleReset = () => {
//     console.log("Filters reset");
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Browse Courses</h2>
//       <div className="grid lg:grid-cols-4 gap-6">
//         <FilterPanel
//           sections={filterSections}
//           values={filters}
//           onChange={handleFilterChange}
//           onReset={handleReset}
//           title="Filters"
//           autoApply={false}
//           showActiveCount={true}
//         />

//         {/* Results Preview */}
//         <div className="lg:col-span-3 space-y-4">
//           <p className="text-gray-600">
//             Showing courses matching your filters...
//           </p>
//           {/* Course cards would go here */}
//         </div>
//       </div>
//     </div>
//   );
// }

// // Example 2: Assignment Filter with Auto-Apply
// export function AssignmentFilterPanel() {
//   const [filters, setFilters] = useState({
//     status: "all",
//     difficulty: [],
//     subject: [],
//     search: "",
//   });

//   const filterSections = [
//     {
//       id: "search",
//       title: "Search",
//       type: "search" as const,
//       options: [],
//     },
//     {
//       id: "status",
//       title: "Status",
//       type: "radio" as const,
//       options: [
//         { value: "all", label: "All Assignments" },
//         { value: "pending", label: "Pending", count: 5 },
//         { value: "submitted", label: "Submitted", count: 12 },
//         { value: "graded", label: "Graded", count: 8 },
//       ],
//     },
//     {
//       id: "difficulty",
//       title: "Difficulty",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "easy", label: "Easy", count: 10 },
//         { value: "medium", label: "Medium", count: 15 },
//         { value: "hard", label: "Hard", count: 8 },
//       ],
//     },
//     {
//       id: "subject",
//       title: "Subject",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "react", label: "React", count: 12 },
//         { value: "typescript", label: "TypeScript", count: 8 },
//         { value: "nodejs", label: "Node.js", count: 7 },
//       ],
//     },
//   ];

//   const handleFilterChange = (
//     newFilters: Record<string, string | string[]>
//   ) => {
//     setFilters(newFilters);
//     console.log("Live filter update:", newFilters);
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">My Assignments</h2>
//       <div className="grid lg:grid-cols-4 gap-6">
//         <FilterPanel
//           sections={filterSections}
//           values={filters}
//           onChange={handleFilterChange}
//           title="Filter Assignments"
//           autoApply={true}
//           showActiveCount={true}
//         />

//         {/* Results */}
//         <div className="lg:col-span-3">
//           <p className="text-gray-600">Filtered results appear here...</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Example 3: Lesson Library Filter
// export function LessonLibraryFilter() {
//   const [filters, setFilters] = useState({
//     module: [],
//     type: [],
//     completed: "",
//   });

//   const filterSections = [
//     {
//       id: "module",
//       title: "Module",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: false,
//       options: [
//         { value: "basics", label: "React Basics", count: 8 },
//         { value: "hooks", label: "React Hooks", count: 12 },
//         { value: "patterns", label: "Design Patterns", count: 15 },
//         { value: "performance", label: "Performance", count: 6 },
//       ],
//     },
//     {
//       id: "type",
//       title: "Content Type",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: false,
//       options: [
//         { value: "video", label: "Video", count: 25 },
//         { value: "article", label: "Article", count: 18 },
//         { value: "interactive", label: "Interactive", count: 12 },
//         { value: "quiz", label: "Quiz", count: 8 },
//       ],
//     },
//     {
//       id: "completed",
//       title: "Status",
//       type: "radio" as const,
//       options: [
//         { value: "", label: "All Lessons" },
//         { value: "completed", label: "Completed", count: 32 },
//         { value: "in-progress", label: "In Progress", count: 8 },
//         { value: "not-started", label: "Not Started", count: 15 },
//       ],
//     },
//   ];

//   const handleFilterChange = (
//     newFilters: Record<string, string | string[]>
//   ) => {
//     setFilters(newFilters);
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Lesson Library</h2>
//       <div className="grid lg:grid-cols-5 gap-6">
//         <FilterPanel
//           sections={filterSections}
//           values={filters}
//           onChange={handleFilterChange}
//           title="Lesson Filters"
//           showActiveCount={true}
//         />

//         <div className="lg:col-span-4">
//           <p className="text-gray-600">Lessons matching your criteria...</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Example 4: Complete Learning Dashboard with Filters
// export default function FilterPanelDashboard() {
//   const [courseFilters, setCourseFilters] = useState({
//     level: [],
//     category: [],
//     price: "",
//   });

//   const [assignmentFilters, setAssignmentFilters] = useState({
//     status: "pending",
//     priority: [],
//     dueDate: "",
//   });

//   const courseFilterSections = [
//     {
//       id: "level",
//       title: "Skill Level",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "beginner", label: "Beginner", count: 45 },
//         { value: "intermediate", label: "Intermediate", count: 32 },
//         { value: "advanced", label: "Advanced", count: 18 },
//         { value: "expert", label: "Expert", count: 8 },
//       ],
//     },
//     {
//       id: "category",
//       title: "Category",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "frontend", label: "Frontend", count: 28 },
//         { value: "backend", label: "Backend", count: 22 },
//         { value: "fullstack", label: "Full Stack", count: 15 },
//         { value: "devops", label: "DevOps", count: 12 },
//       ],
//     },
//     {
//       id: "price",
//       title: "Price Range",
//       type: "range" as const,
//       options: [
//         { value: "", label: "All Prices" },
//         { value: "free", label: "Free" },
//         { value: "paid-budget", label: "$1 - $50" },
//         { value: "paid-premium", label: "$50+" },
//       ],
//     },
//   ];

//   const assignmentFilterSections = [
//     {
//       id: "status",
//       title: "Status",
//       type: "radio" as const,
//       options: [
//         { value: "all", label: "All" },
//         { value: "pending", label: "Pending", count: 5 },
//         { value: "submitted", label: "Submitted", count: 12 },
//         { value: "graded", label: "Graded", count: 8 },
//       ],
//     },
//     {
//       id: "priority",
//       title: "Priority",
//       type: "checkbox" as const,
//       multiple: true,
//       collapsible: true,
//       options: [
//         { value: "high", label: "High", count: 3 },
//         { value: "medium", label: "Medium", count: 8 },
//         { value: "low", label: "Low", count: 14 },
//       ],
//     },
//     {
//       id: "dueDate",
//       title: "Due Date",
//       type: "range" as const,
//       options: [
//         { value: "", label: "Any Time" },
//         { value: "today", label: "Today" },
//         { value: "week", label: "This Week" },
//         { value: "month", label: "This Month" },
//       ],
//     },
//   ];

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="mb-12 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Learning Dashboard
//           </h1>
//           <p className="text-gray-600">
//             Filter and explore your courses and assignments
//           </p>
//         </div>

//         {/* Course Section */}
//         <div className="mb-12">
//           <h2 className="text-2xl font-bold text-black mb-6">Browse Courses</h2>
//           <div className="grid lg:grid-cols-4 gap-6">
//             <FilterPanel
//               sections={courseFilterSections}
//               values={courseFilters}
//               onChange={setCourseFilters}
//               title="Course Filters"
//               showActiveCount={true}
//             />

//             <div className="lg:col-span-3">
//               <div className="space-y-3">
//                 {[1, 2, 3].map((i) => (
//                   <Card key={i} variant="outlined" hoverable className="p-4">
//                     <h3 className="font-semibold text-black mb-2">
//                       Course {i}: React Patterns
//                     </h3>
//                     <div className="flex gap-2 flex-wrap">
//                       <Badge label="Intermediate" color="indigo" size="sm" />
//                       <Badge label="Frontend" color="blue" size="sm" />
//                     </div>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Assignment Section */}
//         <div className="border-t border-gray-200 pt-12">
//           <h2 className="text-2xl font-bold text-black mb-6">My Assignments</h2>
//           <div className="grid lg:grid-cols-4 gap-6">
//             <FilterPanel
//               sections={assignmentFilterSections}
//               values={assignmentFilters}
//               onChange={setAssignmentFilters}
//               title="Assignment Filters"
//               autoApply={true}
//               showActiveCount={true}
//             />

//             <div className="lg:col-span-3">
//               <div className="space-y-3">
//                 {[1, 2, 3].map((i) => (
//                   <Card key={i} variant="outlined" hoverable className="p-4">
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <h3 className="font-semibold text-black mb-1">
//                           Assignment {i}: Build Todo App
//                         </h3>
//                         <p className="text-sm text-gray-600">Due in 3 days</p>
//                       </div>
//                       <Badge label="High" color="red" size="sm" />
//                     </div>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }