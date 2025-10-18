import { useMemo, useCallback } from "react";
import { Card, Button, Avatar, Badge } from "@/components/UI";
import { ProgressBar } from "@/components/reuse";

interface UserStat {
  coursesCompleted: number;
  totalEnrollments: number;
  hoursLearned: number;
  certificates: number;
  currentStreak: number;
}

interface UserSkill {
  name: string;
  level: number;
  category: string;
}

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
  stats?: UserStat;
  skills?: UserSkill[];
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
  const formatJoinDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  }, []);

  const formatLastActive = useCallback((dateString: string) => {
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
  }, []);

  const getSkillLevel = useCallback((level: number): string => {
    if (level >= 80) return "Expert";
    if (level >= 60) return "Advanced";
    if (level >= 40) return "Intermediate";
    return "Beginner";
  }, []);

  const getSkillColor = useCallback((level: number): "indigo" | "blue" | "green" | "yellow" => {
    if (level >= 80) return "indigo";
    if (level >= 60) return "blue";
    if (level >= 40) return "green";
    return "yellow";
  }, []);

  const joinDateFormatted = useMemo(
    () => formatJoinDate(user.joinDate),
    [user.joinDate, formatJoinDate]
  );

  const lastActiveFormatted = useMemo(
    () => formatLastActive(user.lastActive),
    [user.lastActive, formatLastActive]
  );

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
              <h1 className="text-2xl font-bold text-black">{user.name}</h1>
              <p className="text-gray-600">{user.role}</p>
              <Badge
                label="Pro Member"
                color="indigo"
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
                <h3 className="font-medium text-black mb-2">About</h3>
                <p className="text-gray-600">{user.bio}</p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-gray-600 text-sm">{user.email}</span>
              </div>

              {/* Location */}
              {user.location && (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
                  <span className="text-gray-600 text-sm">{user.location}</span>
                </div>
              )}

              {/* Join Date */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-gray-600 text-sm">
                  Joined {joinDateFormatted}
                </span>
              </div>

              {/* Last Active */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-gray-600 text-sm">
                  Active {lastActiveFormatted}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 flex-wrap">
              <Button
                variant="primary"
                label="Edit Profile"
                onClick={onEdit}
              />
              <Button
                variant="outline"
                label="Send Message"
                onClick={onMessage}
              />
              <Button
                variant="outline"
                label="Follow"
                onClick={onFollow}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Section */}
      {stats && (
        <Card variant="elevated" className="p-6">
          <h2 className="text-xl font-bold text-black mb-6">
            Learning Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard
              value={stats.coursesCompleted}
              label="Courses Completed"
              color="indigo"
            />
            <StatCard
              value={stats.totalEnrollments}
              label="Total Enrollments"
              color="green"
            />
            <StatCard
              value={stats.hoursLearned}
              label="Hours Learned"
              color="blue"
            />
            <StatCard
              value={stats.certificates}
              label="Certificates"
              color="purple"
            />
          </div>

          {/* Streak Indicator */}
          {stats.currentStreak > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {stats.currentStreak}
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-900">
                    Learning Streak!
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    You&apos;ve been learning for {stats.currentStreak} consecutive days
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
          <h2 className="text-xl font-bold text-black mb-6">
            Skills & Proficiencies
          </h2>
          <div className="space-y-5">
            {skills.map((skill) => (
              <SkillItem
                key={`${skill.name}-${skill.category}`}
                skill={skill}
                skillLevel={getSkillLevel(skill.level)}
                skillColor={getSkillColor(skill.level)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface StatCardProps {
  value: number;
  label: string;
  color: "indigo" | "green" | "blue" | "purple";
}

function StatCard({ value, label, color }: StatCardProps) {
  const colorStyles: Record<string, string> = {
    indigo: "text-indigo-600",
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${colorStyles[color]} mb-2`}>
        {value}
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

interface SkillItemProps {
  skill: UserSkill;
  skillLevel: string;
  skillColor: "indigo" | "blue" | "green" | "yellow";
}

function SkillItem({ skill, skillLevel, skillColor }: SkillItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-medium text-black">{skill.name}</span>
        <span className="text-sm text-gray-500">{skill.level}%</span>
      </div>
      <ProgressBar
        value={skill.level}
        max={100}
        color={skillColor}
        size="sm"
        animated={true}
        showLabel={false}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{skill.category}</span>
        <Badge
          label={skillLevel}
          color={skillColor}
          size="sm"
          variant="soft"
        />
      </div>
    </div>
  );
}

// Usage Examples:
// import UserProfile from "@/components/UserProfile";
// import { useState } from "react";

// // Example 1: Student Profile
// export function StudentProfile() {
//   const student = {
//     id: "user-001",
//     name: "Alex Johnson",
//     email: "alex.johnson@example.com",
//     avatar: "/avatars/alex.jpg",
//     role: "Student",
//     bio: "Passionate learner interested in web development and design.",
//     location: "San Francisco, CA",
//     website: "alexjohnson.dev",
//     joinDate: "2023-03-15",
//     lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
//   };

//   const stats = {
//     coursesCompleted: 12,
//     totalEnrollments: 18,
//     hoursLearned: 156,
//     certificates: 8,
//     currentStreak: 7,
//   };

//   const skills = [
//     { name: "React", level: 85, category: "Frontend" },
//     { name: "TypeScript", level: 72, category: "Language" },
//     { name: "Tailwind CSS", level: 90, category: "Styling" },
//     { name: "Node.js", level: 65, category: "Backend" },
//   ];

//   const handleEdit = () => console.log("Edit profile");
//   const handleMessage = () => console.log("Send message");
//   const handleFollow = () => console.log("Follow user");

//   return (
//     <UserProfile
//       user={student}
//       stats={stats}
//       skills={skills}
//       onEdit={handleEdit}
//       onMessage={handleMessage}
//       onFollow={handleFollow}
//     />
//   );
// }

// // Example 2: Instructor Profile
// export function InstructorProfile() {
//   const instructor = {
//     id: "inst-001",
//     name: "Dr. Sarah Williams",
//     email: "sarah.williams@platform.com",
//     avatar: "/avatars/sarah.jpg",
//     role: "Instructor",
//     bio: "React expert with 8+ years of experience. Teaching modern web development since 2018.",
//     location: "New York, NY",
//     website: "sarahwilliams.dev",
//     joinDate: "2018-06-20",
//     lastActive: new Date().toISOString(),
//   };

//   const stats = {
//     coursesCompleted: 45,
//     totalEnrollments: 250,
//     hoursLearned: 1250,
//     certificates: 120,
//     currentStreak: 42,
//   };

//   const skills = [
//     { name: "React", level: 95, category: "Frontend" },
//     { name: "Web Architecture", level: 92, category: "Backend" },
//     { name: "Teaching", level: 88, category: "Soft Skills" },
//     { name: "JavaScript", level: 98, category: "Language" },
//   ];

//   return (
//     <UserProfile
//       user={instructor}
//       stats={stats}
//       skills={skills}
//     />
//   );
// }

// // Example 3: Beginner Learner Profile
// export function BeginnerProfile() {
//   const beginner = {
//     id: "user-002",
//     name: "Jordan Smith",
//     email: "jordan@example.com",
//     avatar: "/avatars/jordan.jpg",
//     role: "Learner",
//     bio: "Starting my programming journey. Excited to learn web development!",
//     location: "Austin, TX",
//     joinDate: "2024-01-10",
//     lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
//   };

//   const stats = {
//     coursesCompleted: 1,
//     totalEnrollments: 3,
//     hoursLearned: 24,
//     certificates: 0,
//     currentStreak: 0,
//   };

//   const skills = [
//     { name: "HTML", level: 45, category: "Frontend" },
//     { name: "CSS", level: 40, category: "Styling" },
//   ];

//   return (
//     <UserProfile
//       user={beginner}
//       stats={stats}
//       skills={skills}
//     />
//   );
// }

// // Example 4: Public Profile View (Read-only)
// export function PublicProfileView() {
//   const user = {
//     id: "user-003",
//     name: "Emma Davis",
//     email: "emma@example.com",
//     avatar: "/avatars/emma.jpg",
//     role: "Advanced Learner",
//     bio: "Full stack developer focused on scalable applications.",
//     location: "London, UK",
//     joinDate: "2022-08-05",
//     lastActive: new Date(Date.now() - 3600000).toISOString(),
//   };

//   const stats = {
//     coursesCompleted: 28,
//     totalEnrollments: 35,
//     hoursLearned: 450,
//     certificates: 22,
//     currentStreak: 15,
//   };

//   const skills = [
//     { name: "Full Stack", level: 88, category: "Development" },
//     { name: "React", level: 92, category: "Frontend" },
//     { name: "Docker", level: 78, category: "DevOps" },
//     { name: "PostgreSQL", level: 85, category: "Database" },
//     { name: "System Design", level: 80, category: "Architecture" },
//   ];

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-4xl mx-auto">
//         <UserProfile
//           user={user}
//           stats={stats}
//           skills={skills}
//         />
//       </div>
//     </div>
//   );
// }

// // Example 5: My Profile with Edit Handler
// export function MyProfilePage() {
//   const [isEditing, setIsEditing] = useState(false);

//   const currentUser = {
//     id: "user-current",
//     name: "Your Name",
//     email: "your.email@example.com",
//     avatar: "/avatars/current-user.jpg",
//     role: "Pro Member",
//     bio: "Continuously learning and growing in tech.",
//     location: "San Francisco, CA",
//     website: "yourwebsite.com",
//     joinDate: "2023-01-15",
//     lastActive: new Date().toISOString(),
//   };

//   const stats = {
//     coursesCompleted: 15,
//     totalEnrollments: 22,
//     hoursLearned: 220,
//     certificates: 10,
//     currentStreak: 5,
//   };

//   const skills = [
//     { name: "React", level: 80, category: "Frontend" },
//     { name: "TypeScript", level: 75, category: "Language" },
//     { name: "Next.js", level: 70, category: "Framework" },
//     { name: "Tailwind CSS", level: 85, category: "Styling" },
//     { name: "Git", level: 88, category: "Tools" },
//   ];

//   const handleEdit = () => {
//     setIsEditing(true);
//     console.log("Opening profile editor");
//   };

//   const handleMessage = () => {
//     console.log("Message self - not available");
//   };

//   const handleFollow = () => {
//     console.log("Cannot follow yourself");
//   };

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-4xl mx-auto">
//         {isEditing ? (
//           <div className="p-8 border-2 border-indigo-500 rounded-lg">
//             <h2 className="text-2xl font-bold text-black mb-4">Edit Profile</h2>
//             <p className="text-gray-600">
//               Profile editor would go here...
//             </p>
//             <button
//               onClick={() => setIsEditing(false)}
//               className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
//             >
//               Close Editor
//             </button>
//           </div>
//         ) : (
//           <UserProfile
//             user={currentUser}
//             stats={stats}
//             skills={skills}
//             onEdit={handleEdit}
//             onMessage={handleMessage}
//             onFollow={handleFollow}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// // Example 6: Profile Showcase Page
// export default function UserProfileShowcase() {
//   const profiles = [
//     {
//       name: "Alex Johnson",
//       role: "Student",
//       skills: 4,
//       streak: 7,
//     },
//     {
//       name: "Sarah Williams",
//       role: "Instructor",
//       skills: 4,
//       streak: 42,
//     },
//     {
//       name: "Jordan Smith",
//       role: "Beginner",
//       skills: 2,
//       streak: 0,
//     },
//   ];

//   return (
//     <div className="bg-gray-50 min-h-screen p-8">
//       <div className="max-w-6xl mx-auto">
//         <h1 className="text-4xl font-bold text-black mb-2">User Profiles</h1>
//         <p className="text-gray-600 mb-12">
//           Showcase of different user profile types
//         </p>

//         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//           {profiles.map((profile) => (
//             <div key={profile.name} className="space-y-4">
//               <h2 className="text-xl font-semibold text-black">
//                 {profile.name}
//               </h2>
//               <p className="text-gray-600 text-sm">{profile.role}</p>
//               <div className="space-y-2 text-sm">
//                 <p className="text-gray-600">
//                   {profile.skills} skills tracked
//                 </p>
//                 <p className="text-gray-600">
//                   {profile.streak} day{profile.streak !== 1 ? "s" : ""} streak
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>

//         <div className="mt-12 border-t border-gray-200 pt-8">
//           <h3 className="text-2xl font-bold text-black mb-6">
//             Full Profile Example
//           </h3>
//           <StudentProfile />
//         </div>
//       </div>
//     </div>
//   );
// }