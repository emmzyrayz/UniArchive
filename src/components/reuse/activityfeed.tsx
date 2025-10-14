import { ReactElement } from "react";
import { Card, Avatar, Badge } from "@/components/UI";
import {
  LuBook,
  LuCircleCheck,
  LuMessageCircle,
  LuAward,
  LuUpload,
} from "react-icons/lu";

interface ActivityMetadata {
  course?: string;
  points?: number;
  category?: string;
  level?: string;
  [key: string]: string | number | boolean | undefined;
}

interface ActivityItem {
  id: string;
  type: "enrollment" | "completion" | "comment" | "achievement" | "upload";
  user: {
    name: string;
    avatar?: string;
  };
  title: string;
  description?: string;
  target?: string;
  timestamp: string;
  metadata?: ActivityMetadata;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
  className?: string;
  onItemClick?: (activity: ActivityItem) => void;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export default function ActivityFeed({
  activities,
  title = "Recent Activity",
  emptyMessage = "No recent activity",
  maxItems,
  className = "",
  onItemClick,
  showViewAll = false,
  onViewAll,
}: ActivityFeedProps) {
  const displayActivities = maxItems
    ? activities.slice(0, maxItems)
    : activities;

  const getActivityIcon = (type: ActivityItem["type"]): ReactElement => {
    const icons = {
      enrollment: <LuBook className="w-5 h-5" />,
      completion: <LuCircleCheck className="w-5 h-5" />,
      comment: <LuMessageCircle className="w-5 h-5" />,
      achievement: <LuAward className="w-5 h-5" />,
      upload: <LuUpload className="w-5 h-5" />,
    };

    return icons[type];
  };

  const getActivityColor = (type: ActivityItem["type"]): string => {
    const colors = {
      enrollment: "text-blue-600 bg-blue-50",
      completion: "text-green-600 bg-green-50",
      comment: "text-yellow-600 bg-yellow-50",
      achievement: "text-purple-600 bg-purple-50",
      upload: "text-indigo-600 bg-indigo-50",
    };

    return colors[type];
  };

  const formatTimestamp = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (now.getTime() - activityTime.getTime()) / 1000
    );

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return activityTime.toLocaleDateString();
  };

  const getActivityTypeLabel = (type: ActivityItem["type"]): string => {
    const labels = {
      enrollment: "Enrolled",
      completion: "Completed",
      comment: "Commented",
      achievement: "Achievement",
      upload: "Uploaded",
    };

    return labels[type];
  };

  return (
    <Card variant="elevated" padding="none" className={className}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showViewAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              View All
            </button>
          )}
        </div>
      )}

      {/* Activity List */}
      <div className="divide-y divide-gray-100">
        {displayActivities.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <LuBook className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          displayActivities.map((activity, index) => (
            <div
              key={activity.id}
              className={`
                px-6 py-4 transition-all duration-200
                ${
                  onItemClick
                    ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    : ""
                }
                ${index === 0 ? "bg-blue-50/30" : ""}
              `}
              onClick={() => onItemClick?.(activity)}
            >
              <div className="flex items-start gap-4">
                {/* User Avatar */}
                <Avatar
                  src={activity.user.avatar}
                  alt={activity.user.name}
                  size="md"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header: User name, type badge, timestamp */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {activity.user.name}
                    </span>
                    <Badge
                      label={getActivityTypeLabel(activity.type)}
                      color="gray"
                      variant="soft"
                      size="sm"
                    />
                    <span className="text-sm text-gray-500 ml-auto">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-gray-900 font-medium mb-1">
                    {activity.title}
                  </p>

                  {/* Description */}
                  {activity.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {activity.description}
                    </p>
                  )}

                  {/* Target */}
                  {activity.target && (
                    <p className="text-sm text-indigo-600 font-medium hover:text-indigo-700 mb-2">
                      → {activity.target}
                    </p>
                  )}

                  {/* Metadata Tags */}
                  {activity.metadata && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activity.metadata.course && (
                        <Badge
                          label={activity.metadata.course}
                          color="blue"
                          variant="outlined"
                          size="sm"
                        />
                      )}
                      {activity.metadata.points && (
                        <Badge
                          label={`+${activity.metadata.points} pts`}
                          color="green"
                          variant="soft"
                          size="sm"
                        />
                      )}
                      {activity.metadata.category && (
                        <Badge
                          label={activity.metadata.category}
                          color="indigo"
                          variant="soft"
                          size="sm"
                        />
                      )}
                      {activity.metadata.level && (
                        <Badge
                          label={activity.metadata.level}
                          color="gray"
                          variant="outlined"
                          size="sm"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Activity Type Icon */}
                <div
                  className={`flex-shrink-0 p-3 rounded-lg ${getActivityColor(
                    activity.type
                  )}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// Usage Example

// 1. Basic Activity Feed
// tsxconst activities = [
//   {
//     id: "1",
//     type: "enrollment" as const,
//     user: {
//       name: "John Doe",
//       avatar: "/john.jpg",
//     },
//     title: "Enrolled in Introduction to Algorithms",
//     timestamp: new Date().toISOString(),
//   },
//   {
//     id: "2",
//     type: "completion" as const,
//     user: {
//       name: "Jane Smith",
//       avatar: "/jane.jpg",
//     },
//     title: "Completed Data Structures Course",
//     description: "Scored 95% on the final exam",
//     timestamp: new Date(Date.now() - 3600000).toISOString(),
//     metadata: {
//       points: 500,
//       course: "CS 201",
//     },
//   },
// ];

// <ActivityFeed activities={activities} />
// 2. Dashboard Widget (Limited Items)
// tsx<ActivityFeed
//   activities={recentActivities}
//   title="Recent Activity"
//   maxItems={5}
//   showViewAll
//   onViewAll={() => router.push("/activity")}
//   onItemClick={(activity) => console.log("Clicked:", activity)}
// />
// 3. Complete Example with All Features
// tsxconst activities = [
//   {
//     id: "1",
//     type: "achievement" as const,
//     user: {
//       name: "Emmanuel Okoro",
//       avatar: "/emmanuel.jpg",
//     },
//     title: "Earned 'Algorithm Master' Badge",
//     description: "Completed all algorithm courses with perfect scores",
//     timestamp: new Date().toISOString(),
//     metadata: {
//       points: 1000,
//       category: "Algorithms",
//       level: "Advanced",
//     },
//   },
//   {
//     id: "2",
//     type: "upload" as const,
//     user: {
//       name: "Sarah Williams",
//       avatar: "/sarah.jpg",
//     },
//     title: "Uploaded new study material",
//     description: "CS 301 - Final Exam Preparation Notes",
//     target: "Computer Science Department",
//     timestamp: new Date(Date.now() - 1800000).toISOString(),
//     metadata: {
//       course: "CS 301",
//       category: "Notes",
//     },
//   },
//   {
//     id: "3",
//     type: "comment" as const,
//     user: {
//       name: "Mike Johnson",
//       avatar: "/mike.jpg",
//     },
//     title: "Commented on your assignment",
//     description: "Great work! Your implementation is very efficient.",
//     target: "Binary Search Trees Assignment",
//     timestamp: new Date(Date.now() - 7200000).toISOString(),
//   },
//   {
//     id: "4",
//     type: "enrollment" as const,
//     user: {
//       name: "Lisa Chen",
//       avatar: "/lisa.jpg",
//     },
//     title: "Enrolled in Machine Learning Basics",
//     timestamp: new Date(Date.now() - 86400000).toISOString(),
//     metadata: {
//       course: "ML 101",
//       level: "Beginner",
//     },
//   },
//   {
//     id: "5",
//     type: "completion" as const,
//     user: {
//       name: "Tom Brown",
//       avatar: "/tom.jpg",
//     },
//     title: "Completed Web Development Course",
//     description: "Built 5 projects including a full-stack application",
//     timestamp: new Date(Date.now() - 172800000).toISOString(),
//     metadata: {
//       points: 750,
//       course: "WEB 301",
//       level: "Intermediate",
//     },
//   },
// ];

// <ActivityFeed
//   activities={activities}
//   title="What's Happening"
//   emptyMessage="No activity to show yet"
//   className="max-w-2xl"
//   onItemClick={(activity) => {
//     console.log("Activity clicked:", activity);
//     // Navigate to relevant page
//   }}
// />
// 4. Profile Page - User Activity
// tsx<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//   <div className="lg:col-span-2">
//     {/* Main content */}
//   </div>
//   <div>
//     <ActivityFeed
//       activities={userActivities}
//       title="Your Activity"
//       maxItems={10}
//       emptyMessage="You haven't done anything yet"
//     />
//   </div>
// </div>
// 5. Course Page - Recent Activity
// tsx<ActivityFeed
//   activities={courseActivities}
//   title="Recent Course Activity"
//   maxItems={5}
//   showViewAll
//   onViewAll={() => router.push(`/courses/${courseId}/activity`)}
//   onItemClick={(activity) => {
//     if (activity.type === "comment") {
//       router.push(`/courses/${courseId}/discussions/${activity.id}`);
//     }
//   }}
// />
// 6. Real-time Activity Feed (with auto-refresh)
// tsx"use client";

// import { useEffect, useState } from "react";
// import { ActivityFeed } from "@/components/complex";

// export default function LiveActivityFeed() {
//   const [activities, setActivities] = useState([]);

//   useEffect(() => {
//     // Fetch initial activities
//     fetchActivities();

//     // Poll for new activities every 30 seconds
//     const interval = setInterval(fetchActivities, 30000);

//     return () => clearInterval(interval);
//   }, []);

//   const fetchActivities = async () => {
//     const response = await fetch("/api/activities");
//     const data = await response.json();
//     setActivities(data);
//   };

//   return (
//     <ActivityFeed
//       activities={activities}
//       title="Live Activity Feed"
//       showViewAll
//       onViewAll={() => router.push("/activity")}
//     />
//   );
// }
// 7. Filtered Activity Feed
// tsxconst [filter, setFilter] = useState<ActivityItem["type"] | "all">("all");

// const filteredActivities = filter === "all" 
//   ? activities 
//   : activities.filter(a => a.type === filter);

// <div>
//   <div className="flex gap-2 mb-4">
//     <Badge label="All" onClick={() => setFilter("all")} />
//     <Badge label="Enrollments" onClick={() => setFilter("enrollment")} />
//     <Badge label="Completions" onClick={() => setFilter("completion")} />
//     <Badge label="Comments" onClick={() => setFilter("comment")} />
//   </div>
  
//   <ActivityFeed activities={filteredActivities} />
// </div>
// 🎨 Features:

// ✅ Type-safe metadata - Properly typed with index signature
// ✅ Smart timestamps - "Just now", "5m ago", "2h ago", etc.
// ✅ Activity type icons - Visual indicators for each type
// ✅ Clickable items - Optional onClick handler
// ✅ Metadata badges - Display points, courses, categories
// ✅ Empty state - Helpful message when no activities
// ✅ View All button - Link to full activity page
// ✅ Highlight recent - First item subtly highlighted