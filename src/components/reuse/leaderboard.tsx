import { useMemo, useCallback } from "react";
import { Card, Avatar, Badge } from "@/components/UI";

interface LeaderboardUser {
  name: string;
  avatar?: string;
  role?: string;
}

interface LeaderboardEntry {
  id: string;
  rank: number | string;
  user: LeaderboardUser;
  score: number;
  progress: number;
  completedCourses: number;
  streak: number;
  change?: "up" | "down" | "same";
}

interface LeaderboardProps {
  title?: string;
  entries: LeaderboardEntry[];
  timeframe?: "daily" | "weekly" | "monthly" | "all-time";
  onTimeframeChange?: (timeframe: string) => void;
  currentUserId?: string;
  className?: string;
}

const RANK_CONFIG = {
  1: { color: "from-yellow-400 to-yellow-500", icon: "🥇", shadow: true },
  2: { color: "from-gray-400 to-gray-500", icon: "🥈", shadow: true },
  3: { color: "from-orange-600 to-orange-700", icon: "🥉", shadow: true },
  default: { color: "from-gray-200 to-gray-300", icon: null, shadow: false },
} as const;

const TIMEFRAME_OPTIONS = ["daily", "weekly", "monthly", "all-time"] as const;

export default function Leaderboard({
  title = "Leaderboard",
  entries,
  timeframe = "weekly",
  onTimeframeChange,
  currentUserId,
  className = "",
}: LeaderboardProps) {
  const getRankConfig = useCallback((rank: number | string) => {
    if (rank in RANK_CONFIG && rank !== "default") {
      return RANK_CONFIG[rank as keyof typeof RANK_CONFIG];
    }
    return RANK_CONFIG.default;
  }, []);

  const handleTimeframeClick = useCallback(
    (newTimeframe: string) => {
      onTimeframeChange?.(newTimeframe);
    },
    [onTimeframeChange]
  );

  const memoizedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        rankConfig: getRankConfig(entry.rank),
        displayRank: getRankConfig(entry.rank).icon || entry.rank.toString(),
        isCurrentUser: entry.id === currentUserId,
      })),
    [entries, currentUserId, getRankConfig]
  );

  const isEmpty = entries.length === 0;

  return (
    <Card variant="elevated" className={className}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-semibold text-black">{title}</h3>

          {onTimeframeChange && (
            <nav
              className="flex gap-1 bg-gray-100 rounded-lg p-1"
              role="tablist"
            >
              {TIMEFRAME_OPTIONS.map((time) => (
                <button
                  key={time}
                  onClick={() => handleTimeframeClick(time)}
                  role="tab"
                  aria-selected={timeframe === time}
                  className={`
                    px-3 py-1 text-sm font-medium rounded-md capitalize transition-colors duration-200
                    ${
                      timeframe === time
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-600 hover:text-black hover:bg-gray-200"
                    }
                  `}
                >
                  {time}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Leaderboard List or Empty State */}
      {isEmpty ? (
        <div className="px-6 py-12 text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="font-medium">No leaderboard data available yet.</p>
          <p className="text-sm mt-1">
            Complete courses to appear on the leaderboard!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200" role="list">
          {memoizedEntries.map((entry) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              isCurrentUser={entry.isCurrentUser}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry & {
    rankConfig: (typeof RANK_CONFIG)[keyof typeof RANK_CONFIG];
    displayRank: string;
    isCurrentUser: boolean;
  };
  isCurrentUser: boolean;
}

function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  return (
    <div
      role="listitem"
      className={`
        px-6 py-4 transition-colors duration-200
        ${
          isCurrentUser
            ? "bg-indigo-50 border-l-4 border-l-indigo-500"
            : "hover:bg-gray-50"
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div
          className={`
            w-12 h-12 rounded-full bg-gradient-to-r flex items-center justify-center text-white font-bold text-lg flex-shrink-0
            ${entry.rankConfig.color}
            ${entry.rankConfig.shadow ? "shadow-lg" : ""}
          `}
          aria-label={`Rank ${entry.rank}`}
        >
          {entry.displayRank}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={entry.user.avatar} alt={entry.user.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-black truncate">
                {entry.user.name}
              </h4>
              {entry.user.role && (
                <Badge
                  label={entry.user.role}
                  color="indigo"
                  variant="soft"
                  size="sm"
                />
              )}
              <RankChangeIndicator change={entry.change} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 flex-wrap">
              <span>
                {entry.completedCourses} course
                {entry.completedCourses !== 1 ? "s" : ""}
              </span>
              {entry.streak > 0 && (
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 bg-red-500 rounded-full"
                    aria-hidden="true"
                  ></span>
                  {entry.streak} day streak
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-black">
            {entry.score.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">points</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, entry.progress))}%`,
              }}
              role="progressbar"
              aria-valuenow={Math.round(entry.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress"
            />
          </div>
        </div>
        <span className="text-sm text-gray-500 font-medium min-w-12 text-right">
          {Math.round(entry.progress)}%
        </span>
      </div>
    </div>
  );
}

interface RankChangeIndicatorProps {
  change?: "up" | "down" | "same";
}

function RankChangeIndicator({ change }: RankChangeIndicatorProps) {
  if (!change || change === "same") return null;

  return (
    <span
      className={`text-sm font-semibold ${
        change === "up" ? "text-green-600" : "text-red-600"
      }`}
      aria-label={`Rank ${change}`}
    >
      {change === "up" ? "↑" : "↓"}
    </span>
  );
}

// Usage Examples:

// import Leaderboard from "@/components/Leaderboard";
// import { Card } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Basic Leaderboard
// export function BasicLeaderboardExample() {
//   const entries = [
//     {
//       id: "user1",
//       rank: 1,
//       user: {
//         name: "Alex Johnson",
//         avatar: "/avatars/alex.jpg",
//         role: "Top Learner",
//       },
//       score: 2850,
//       progress: 95,
//       completedCourses: 12,
//       streak: 45,
//       change: "same",
//     },
//     {
//       id: "user2",
//       rank: 2,
//       user: { name: "Jordan Smith", avatar: "/avatars/jordan.jpg" },
//       score: 2640,
//       progress: 85,
//       completedCourses: 10,
//       streak: 28,
//       change: "up",
//     },
//     {
//       id: "user3",
//       rank: 3,
//       user: { name: "Taylor Brown", avatar: "/avatars/taylor.jpg" },
//       score: 2420,
//       progress: 78,
//       completedCourses: 8,
//       streak: 0,
//       change: "down",
//     },
//     {
//       id: "user4",
//       rank: 4,
//       user: { name: "Morgan Lee", avatar: "/avatars/morgan.jpg" },
//       score: 2180,
//       progress: 72,
//       completedCourses: 7,
//       streak: 12,
//     },
//   ];

//   return (
//     <div className="p-6">
//       <Leaderboard
//         title="Global Leaderboard"
//         entries={entries}
//         currentUserId="user2"
//       />
//     </div>
//   );
// }

// // Example 2: With Timeframe Switching
// export function TimeframeLeaderboardExample() {
//   const [timeframe, setTimeframe] = useState("weekly");

//   const leaderboards = {
//     daily: [
//       {
//         id: "u1",
//         rank: 1,
//         user: { name: "Casey Brown", avatar: "/avatars/casey.jpg" },
//         score: 450,
//         progress: 100,
//         completedCourses: 1,
//         streak: 5,
//       },
//       {
//         id: "u2",
//         rank: 2,
//         user: { name: "Alex Johnson", avatar: "/avatars/alex.jpg" },
//         score: 380,
//         progress: 85,
//         completedCourses: 1,
//         streak: 45,
//       },
//     ],
//     weekly: [
//       {
//         id: "u1",
//         rank: 1,
//         user: { name: "Alex Johnson", avatar: "/avatars/alex.jpg" },
//         score: 2850,
//         progress: 95,
//         completedCourses: 4,
//         streak: 7,
//       },
//       {
//         id: "u2",
//         rank: 2,
//         user: { name: "Jordan Smith", avatar: "/avatars/jordan.jpg" },
//         score: 2640,
//         progress: 88,
//         completedCourses: 3,
//         streak: 7,
//       },
//     ],
//     monthly: [
//       {
//         id: "u1",
//         rank: 1,
//         user: { name: "Alex Johnson", avatar: "/avatars/alex.jpg" },
//         score: 8500,
//         progress: 95,
//         completedCourses: 12,
//         streak: 30,
//       },
//       {
//         id: "u2",
//         rank: 2,
//         user: { name: "Jordan Smith", avatar: "/avatars/jordan.jpg" },
//         score: 7200,
//         progress: 85,
//         completedCourses: 10,
//         streak: 28,
//       },
//     ],
//     "all-time": [
//       {
//         id: "u1",
//         rank: 1,
//         user: { name: "Alex Johnson", avatar: "/avatars/alex.jpg" },
//         score: 25400,
//         progress: 95,
//         completedCourses: 45,
//         streak: 45,
//       },
//       {
//         id: "u2",
//         rank: 2,
//         user: { name: "Jordan Smith", avatar: "/avatars/jordan.jpg" },
//         score: 23100,
//         progress: 88,
//         completedCourses: 42,
//         streak: 28,
//       },
//     ],
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">Learning Leaderboard</h2>
//       <Leaderboard
//         title="Top Learners"
//         entries={leaderboards[timeframe as keyof typeof leaderboards]}
//         timeframe={timeframe as any}
//         onTimeframeChange={setTimeframe}
//         currentUserId="u1"
//       />
//     </div>
//   );
// }

// // Example 3: Course-Specific Leaderboard
// export function CourseLeaderboardExample() {
//   const entries = [
//     {
//       id: "s1",
//       rank: 1,
//       user: {
//         name: "Emma Watson",
//         avatar: "/avatars/emma.jpg",
//         role: "Expert",
//       },
//       score: 980,
//       progress: 100,
//       completedCourses: 1,
//       streak: 7,
//       change: "same",
//     },
//     {
//       id: "s2",
//       rank: 2,
//       user: {
//         name: "David Park",
//         avatar: "/avatars/david.jpg",
//         role: "Intermediate",
//       },
//       score: 856,
//       progress: 95,
//       completedCourses: 1,
//       streak: 7,
//       change: "up",
//     },
//     {
//       id: "s3",
//       rank: 3,
//       user: { name: "Sarah Chen", avatar: "/avatars/sarah.jpg" },
//       score: 745,
//       progress: 88,
//       completedCourses: 1,
//       streak: 5,
//       change: "down",
//     },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">
//           React Advanced Course
//         </h2>
//         <p className="text-gray-600">Top performers in this course</p>
//       </div>
//       <Leaderboard
//         title="Course Rankings"
//         entries={entries}
//         currentUserId="s1"
//       />
//     </div>
//   );
// }

// // Example 4: Empty State
// export function EmptyLeaderboardExample() {
//   return (
//     <div className="p-6">
//       <Leaderboard title="Upcoming Challenge Leaderboard" entries={[]} />
//     </div>
//   );
// }

// // Example 5: Complete Dashboard
// export default function LeaderboardDashboard() {
//   const [timeframe, setTimeframe] = useState("weekly");
//   const [currentUserId] = useState("current-user");

//   const globalLeaderboard = [
//     {
//       id: "global-1",
//       rank: 1,
//       user: {
//         name: "Alex Johnson",
//         avatar: "/avatars/alex.jpg",
//         role: "Platform Champion",
//       },
//       score: 18500,
//       progress: 98,
//       completedCourses: 35,
//       streak: 62,
//       change: "same",
//     },
//     {
//       id: "global-2",
//       rank: 2,
//       user: { name: "Jordan Smith", avatar: "/avatars/jordan.jpg" },
//       score: 17200,
//       progress: 92,
//       completedCourses: 32,
//       streak: 45,
//       change: "up",
//     },
//     {
//       id: "global-3",
//       rank: 3,
//       user: { name: "Taylor Brown", avatar: "/avatars/taylor.jpg" },
//       score: 15800,
//       progress: 88,
//       completedCourses: 28,
//       streak: 38,
//       change: "same",
//     },
//     {
//       id: "global-4",
//       rank: 4,
//       user: { name: "Morgan Lee", avatar: "/avatars/morgan.jpg" },
//       score: 14200,
//       progress: 82,
//       completedCourses: 25,
//       streak: 0,
//       change: "down",
//     },
//     {
//       id: "current-user",
//       rank: 12,
//       user: { name: "You", avatar: "/avatars/you.jpg", role: "Learner" },
//       score: 8650,
//       progress: 72,
//       completedCourses: 15,
//       streak: 14,
//       change: "up",
//     },
//   ];

//   const courseLeaderboard = [
//     {
//       id: "course-1",
//       rank: 1,
//       user: { name: "Emma Watson", avatar: "/avatars/emma.jpg" },
//       score: 95,
//       progress: 100,
//       completedCourses: 1,
//       streak: 7,
//       change: "same",
//     },
//     {
//       id: "course-2",
//       rank: 2,
//       user: { name: "David Park", avatar: "/avatars/david.jpg" },
//       score: 88,
//       progress: 95,
//       completedCourses: 1,
//       streak: 7,
//       change: "up",
//     },
//     {
//       id: "current-user",
//       rank: 8,
//       user: { name: "You", avatar: "/avatars/you.jpg" },
//       score: 72,
//       progress: 78,
//       completedCourses: 1,
//       streak: 7,
//       change: "up",
//     },
//   ];

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="mb-12 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">Leaderboards</h1>
//           <p className="text-gray-600">
//             Compete with learners and track your progress
//           </p>
//         </div>

//         {/* Global Leaderboard */}
//         <div className="mb-12">
//           <h2 className="text-2xl font-bold text-black mb-6">
//             Global Rankings
//           </h2>
//           <Leaderboard
//             title="All-Time Top Learners"
//             entries={globalLeaderboard}
//             timeframe={timeframe as any}
//             onTimeframeChange={setTimeframe}
//             currentUserId={currentUserId}
//           />
//         </div>

//         {/* Current Course Leaderboard */}
//         <div>
//           <h2 className="text-2xl font-bold text-black mb-6">
//             React Advanced Patterns - Course Rankings
//           </h2>
//           <Leaderboard
//             title="Course Standings"
//             entries={courseLeaderboard}
//             currentUserId={currentUserId}
//           />
//         </div>

//         {/* Stats Summary */}
//         <div className="mt-12 grid md:grid-cols-3 gap-6">
//           <Card variant="outlined" className="p-6 text-center">
//             <p className="text-3xl font-bold text-indigo-600 mb-2">12</p>
//             <p className="text-gray-600">Your Global Rank</p>
//           </Card>

//           <Card variant="outlined" className="p-6 text-center">
//             <p className="text-3xl font-bold text-green-600 mb-2">14</p>
//             <p className="text-gray-600">Current Streak</p>
//           </Card>

//           <Card variant="outlined" className="p-6 text-center">
//             <p className="text-3xl font-bold text-blue-600 mb-2">15</p>
//             <p className="text-gray-600">Courses Completed</p>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }