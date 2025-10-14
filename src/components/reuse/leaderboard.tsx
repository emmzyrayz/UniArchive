import { Card, Avatar, Badge } from "@/components/UI";

interface LeaderboardEntry {
  id: string;
  rank: number;
  user: {
    name: string;
    avatar?: string;
    role?: string;
  };
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

export default function Leaderboard({
  title = "Leaderboard",
  entries,
  timeframe = "weekly",
  onTimeframeChange,
  currentUserId,
  className = "",
}: LeaderboardProps) {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-400 to-yellow-500";
      case 2:
        return "from-gray-400 to-gray-500";
      case 3:
        return "from-orange-600 to-orange-700";
      default:
        return "from-gray-200 to-gray-300";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return rank.toString();
    }
  };

  return (
    <Card variant="elevated" className={className}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

          {onTimeframeChange && (
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {["daily", "weekly", "monthly", "all-time"].map((time) => (
                <button
                  key={time}
                  onClick={() => onTimeframeChange(time)}
                  className={`
                    px-3 py-1 text-sm font-medium rounded-md capitalize transition-colors duration-200
                    ${
                      timeframe === time
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }
                  `}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-200">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`
              px-6 py-4 transition-colors duration-200
              ${
                entry.id === currentUserId
                  ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                  : "hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div
                className={`
                  w-12 h-12 rounded-full bg-gradient-to-r flex items-center justify-center text-white font-bold text-lg
                  ${getRankColor(entry.rank)}
                  ${entry.rank <= 3 ? "shadow-lg" : ""}
                `}
              >
                {getRankIcon(entry.rank)}
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                  src={entry.user.avatar}
                  alt={entry.user.name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">
                      {entry.user.name}
                    </h4>
                    {entry.user.role && (
                      <Badge
                        label={entry.user.role}
                        color="blue"
                        variant="soft"
                        size="sm"
                      />
                    )}
                    {entry.change === "up" && (
                      <span className="text-green-600 text-sm">↑</span>
                    )}
                    {entry.change === "down" && (
                      <span className="text-red-600 text-sm">↓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{entry.completedCourses} courses</span>
                    {entry.streak > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {entry.streak} day streak
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">points</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-gray-500 min-w-12">
                {Math.round(entry.progress)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p>No leaderboard data available yet.</p>
          <p className="text-sm mt-1">
            Complete courses to appear on the leaderboard!
          </p>
        </div>
      )}
    </Card>
  );
}
