import Image from "next/image";
import { useState,  } from "react";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  fallback?: string;
  className?: string;
  onClick?: () => void;
  status?: "online" | "offline" | "away" | "busy";
  shape?: "circle" | "square";
}

export default function Avatar({
  src,
  alt = "",
  size = "md",
  fallback,
  className = "",
  onClick,
  status,
  shape = "circle",
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    xs: { container: "w-6 h-6", text: "text-xs", status: "w-2 h-2" },
    sm: { container: "w-8 h-8", text: "text-sm", status: "w-2.5 h-2.5" },
    md: { container: "w-12 h-12", text: "text-base", status: "w-3 h-3" },
    lg: { container: "w-16 h-16", text: "text-lg", status: "w-4 h-4" },
    xl: { container: "w-24 h-24", text: "text-2xl", status: "w-5 h-5" },
  };

  const statusRingStyles = {
    online: "ring-4 ring-green-500",
    offline: "ring-4 ring-gray-400",
    away: "ring-4 ring-yellow-400",
    busy: "ring-4 ring-red-500",
  };

  const shapeStyles = {
    circle: "rounded-full",
    square: "rounded-lg",
  };

  const sizes = sizeMap[size];

  // Generate initials from alt text if no fallback provided
  const getInitials = () => {
    if (fallback) return fallback;
    if (!alt) return "?";

    const words = alt.trim().split(" ");
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Generate color based on name
  const getBackgroundColor = () => {
    const colors = [
      "bg-indigo-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-pink-500",
      "bg-purple-500",
      "bg-teal-500",
    ];

    const index = alt
      ? alt.charCodeAt(0) % colors.length
      : Math.floor(Math.random() * colors.length);

    return colors[index];
  };

  const showImage = src && !imageError;

  return (
    <div
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center 
        overflow-hidden
        ${sizes.container}
        ${shapeStyles[shape]}
        ${showImage ? "bg-gray-200" : getBackgroundColor()}
        ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
        ${status ? statusRingStyles[status] : ""}
        ${className}
      `}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={`font-semibold text-white ${sizes.text}`}>
          {getInitials()}
        </span>
      )}
    </div>
  );
}

// Usage Example

// import { Avatar } from "@/components/UI";

// function MyComponent() {
//   return (
//     <div className="space-y-8">
//       {/* Basic Avatar with Image */}
//       <Avatar src="/images/user.jpg" alt="John Doe" size="md" />

//       {/* Avatar with Initials (no image) */}
//       <Avatar alt="John Doe" size="lg" />

//       {/* Custom Fallback */}
//       <Avatar alt="John Doe" fallback="JD" size="md" />

//       {/* With Status Indicator */}
//       <Avatar
//         src="/images/user.jpg"
//         alt="Jane Smith"
//         status="online"
//         size="lg"
//       />

//       {/* Clickable Avatar */}
//       <Avatar
//         src="/images/user.jpg"
//         alt="Mike Johnson"
//         onClick={() => navigate("/profile")}
//         size="md"
//       />

//       {/* Square Avatar */}
//       <Avatar
//         src="/images/logo.png"
//         alt="Company Logo"
//         shape="square"
//         size="lg"
//       />

//       {/* Different Sizes */}
//       <div className="flex items-center gap-2">
//         <Avatar alt="John Doe" size="xs" />
//         <Avatar alt="Jane Smith" size="sm" />
//         <Avatar alt="Mike Johnson" size="md" />
//         <Avatar alt="Sarah Wilson" size="lg" />
//         <Avatar alt="Tom Brown" size="xl" />
//       </div>

//       {/* User List with Status */}
//       <div className="space-y-3">
//         {users.map((user) => (
//           <div key={user.id} className="flex items-center gap-3">
//             <Avatar
//               src={user.avatar}
//               alt={user.name}
//               status={user.status}
//               size="md"
//               onClick={() => viewProfile(user.id)}
//             />
//             <div>
//               <p className="font-medium">{user.name}</p>
//               <p className="text-sm text-gray-500">{user.role}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Avatar Group (Overlapping) */}
//       <div className="flex -space-x-2">
//         <Avatar
//           src="/user1.jpg"
//           alt="User 1"
//           size="sm"
//           className="ring-2 ring-white"
//         />
//         <Avatar
//           src="/user2.jpg"
//           alt="User 2"
//           size="sm"
//           className="ring-2 ring-white"
//         />
//         <Avatar
//           src="/user3.jpg"
//           alt="User 3"
//           size="sm"
//           className="ring-2 ring-white"
//         />
//         <Avatar
//           fallback="+5"
//           size="sm"
//           className="ring-2 ring-white bg-gray-600"
//         />
//       </div>

//       {/* Profile Header */}
//       <div className="flex items-center gap-4">
//         <Avatar
//           src="/profile.jpg"
//           alt="Emmanuel Okoro"
//           size="xl"
//           status="online"
//         />
//         <div>
//           <h1 className="text-2xl font-bold">Emmanuel Okoro</h1>
//           <p className="text-gray-600">Web Developer</p>
//         </div>
//       </div>

//       {/* Comment Section */}
//       <div className="space-y-4">
//         {comments.map((comment) => (
//           <div key={comment.id} className="flex gap-3">
//             <Avatar
//               src={comment.user.avatar}
//               alt={comment.user.name}
//               size="sm"
//             />
//             <div className="flex-1 bg-gray-50 rounded-lg p-3">
//               <p className="font-medium text-sm">{comment.user.name}</p>
//               <p className="text-sm text-gray-700">{comment.text}</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
