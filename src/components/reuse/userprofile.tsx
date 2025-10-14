import { Card } from "./card";
import { Button } from "./button";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { ProgressBar } from "./progress-bar";

interface UserProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    bio?: string;
    location?: string;
    website?: string;
    joinDate: string;
    lastActive: string;
  };
  stats?: {
    coursesCompleted: number;
    totalEnrollments: number;
    hoursLearned: number;
    certificates: number;
    currentStreak: number;
  };
  skills?: Array<{
    name: string;
    level: number;
    category: string;
  }>;
  onEdit?: () => void;
  onMessage?: () => void;
  onFollow?: () => void;
  className?: string;
}

export default function UserProfile({
  user,
  stats,
  skills,
  onEdit,
  onMessage,
  onFollow,
  className = "",
}: UserProfileProps) {
  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const formatLastActive = (dateString: string) => {
    const now = new Date();
    const lastActive = new Date(dateString);
    const diffInDays = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Header */}
      <Card variant="elevated" className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center lg:items-start gap-4">
            <Avatar
              src={user.avatar}
              alt={user.name}
              size="xl"
              status="online"
            />
            <div className="text-center lg:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">{user.role}</p>
              <Badge
                label="Pro Member"
                color="purple"
                variant="soft"
                className="mt-2"
              />
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-4">
            {/* Bio */}
            {user.bio && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">About</h3>
                <p className="text-gray-600">{user.bio}</p>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-gray-600">{user.email}</span>
              </div>

              {user.location && (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-gray-600">{user.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-gray-600">
                  Joined {formatJoinDate(user.joinDate)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-gray-600">
                  Active {formatLastActive(user.lastActive)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="primary" label="Edit Profile" onClick={onEdit} />
              <Button
                variant="outline"
                label="Send Message"
                onClick={onMessage}
              />
              <Button variant="outline" label="Follow" onClick={onFollow} />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Section */}
      {stats && (
        <Card variant="elevated" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Learning Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                {stats.coursesCompleted}
              </div>
              <div className="text-sm text-gray-600">Courses Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.totalEnrollments}
              </div>
              <div className="text-sm text-gray-600">Total Enrollments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.hoursLearned}
              </div>
              <div className="text-sm text-gray-600">Hours Learned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {stats.certificates}
              </div>
              <div className="text-sm text-gray-600">Certificates</div>
            </div>
          </div>

          {/* Streak */}
          {stats.currentStreak > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                  {stats.currentStreak}
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800">
                    Learning Streak!
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    You've been learning for {stats.currentStreak} consecutive
                    days
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Skills Section */}
      {skills && skills.length > 0 && (
        <Card variant="elevated" className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Skills & Proficiencies
          </h2>
          <div className="space-y-4">
            {skills.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">
                    {skill.name}
                  </span>
                  <span className="text-sm text-gray-500">{skill.level}%</span>
                </div>
                <ProgressBar
                  value={skill.level}
                  color="indigo"
                  size="sm"
                  animated
                />
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">
                    {skill.category}
                  </span>
                  <Badge
                    label={
                      skill.level >= 80
                        ? "Expert"
                        : skill.level >= 60
                        ? "Advanced"
                        : skill.level >= 40
                        ? "Intermediate"
                        : "Beginner"
                    }
                    color={
                      skill.level >= 80
                        ? "purple"
                        : skill.level >= 60
                        ? "blue"
                        : skill.level >= 40
                        ? "green"
                        : "yellow"
                    }
                    size="sm"
                    variant="soft"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
