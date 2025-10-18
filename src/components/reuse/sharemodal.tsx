import { useState, useCallback } from "react";
import { Modal, Button, Input, Alert } from "@/components/UI";

interface SharePlatform {
  name: string;
  icon: string;
  color: string;
  getShareUrl: (url: string, title: string) => string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  description?: string;
  onShare?: (platform: string, url: string) => void;
  className?: string;
  showEmbed?: boolean;
  embedWidth?: number;
  embedHeight?: number;
}

export default function ShareModal({
  isOpen,
  onClose,
  title,
  url,
  description,
  onShare,
  className = "",
  showEmbed = true,
  embedWidth = 100,
  embedHeight = 400,
}: ShareModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const sharePlatforms: SharePlatform[] = [
    {
      name: "Facebook",
      icon: "📘",
      color: "bg-blue-600 hover:bg-blue-700",
      getShareUrl: (url) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          url
        )}`,
    },
    {
      name: "Twitter",
      icon: "𝕏",
      color: "bg-black hover:bg-gray-800",
      getShareUrl: (url, title) =>
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          url
        )}&text=${encodeURIComponent(title)}`,
    },
    {
      name: "LinkedIn",
      icon: "💼",
      color: "bg-blue-700 hover:bg-blue-800",
      getShareUrl: (url) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          url
        )}`,
    },
    {
      name: "WhatsApp",
      icon: "💚",
      color: "bg-green-500 hover:bg-green-600",
      getShareUrl: (url, title) =>
        `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
    },
    {
      name: "Email",
      icon: "📧",
      color: "bg-gray-600 hover:bg-gray-700",
      getShareUrl: (url, title) =>
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
          url
        )}`,
    },
  ];

  const copyToClipboard = useCallback(
    async (textToCopy: string, copyType: "link" | "embed") => {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(copyType);
        setTimeout(() => setCopied(null), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          setCopied(copyType);
          setTimeout(() => setCopied(null), 2000);
        } catch (execErr) {
          console.error("Copy failed:", execErr);
        }
        document.body.removeChild(textArea);
        console.error(err)
      }
    },
    []
  );

  const handlePlatformShare = useCallback(
    (platform: SharePlatform) => {
      onShare?.(platform.name, url);

      const shareUrl = platform.getShareUrl(url, title);
      window.open(shareUrl, "_blank", "width=600,height=400");
    },
    [url, title, onShare]
  );

  const embedCode = `<iframe src="${url}" width="${embedWidth}%" height="${embedHeight}" frameborder="0" allowfullscreen></iframe>`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Content"
      size="md"
      className={className}
    >
      <div className="space-y-6">
        {/* Content Preview */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-black mb-1">{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 mb-2">{description}</p>
          )}
          <p className="text-xs text-gray-500 break-all font-mono">{url}</p>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-black">
            Share this link
          </label>
          <div className="flex gap-2">
            <Input value={url} name="share-url" disabled className="flex-1" />
            <Button
              variant={copied === "link" ? "secondary" : "primary"}
              label={copied === "link" ? "Copied!" : "Copy"}
              onClick={() => copyToClipboard(url, "link")}
            />
          </div>
          {copied === "link" && (
            <Alert
              type="success"
              message="Link copied to clipboard!"
              className="py-2"
            />
          )}
        </div>

        {/* Share Platforms */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-black">Share via</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {sharePlatforms.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handlePlatformShare(platform)}
                className={`
                  flex flex-col items-center justify-center p-4 rounded-lg text-white
                  transition-all duration-200 hover:scale-105 active:scale-95
                  ${platform.color}
                `}
                aria-label={`Share on ${platform.name}`}
                title={`Share on ${platform.name}`}
              >
                <span className="text-2xl mb-1">{platform.icon}</span>
                <span className="text-xs font-medium">{platform.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Embed Code Section */}
        {showEmbed && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-black">Embed Code</label>
            <div className="flex gap-2">
              <Input
                value={embedCode}
                name="embed-code"
                disabled
                className="flex-1 font-mono text-xs"
              />
              <Button
                variant="outline"
                label={copied === "embed" ? "Copied!" : "Copy"}
                onClick={() => copyToClipboard(embedCode, "embed")}
              />
            </div>
            {copied === "embed" && (
              <Alert
                type="success"
                message="Embed code copied!"
                className="py-2"
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Usage Examples
// import ShareModal from "@/components/ShareModal";
// import { Button, Card } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Course Share
// export function CourseShareExample() {
//   const [isShareOpen, setIsShareOpen] = useState(false);

//   return (
//     <div className="p-6 space-y-4">
//       <Card variant="elevated">
//         <h3 className="text-lg font-semibold text-black mb-2">
//           React Fundamentals
//         </h3>
//         <p className="text-gray-600 mb-4">
//           Learn the basics of React including components, hooks, and state
//           management.
//         </p>
//         <Button
//           label="Share Course"
//           onClick={() => setIsShareOpen(true)}
//           variant="primary"
//         />
//       </Card>

//       <ShareModal
//         isOpen={isShareOpen}
//         onClose={() => setIsShareOpen(false)}
//         title="React Fundamentals - Free Course"
//         url="https://example.com/courses/react-fundamentals"
//         description="Learn React from scratch with hands-on projects"
//         onShare={(platform, url) =>
//           console.log(`Shared on ${platform}: ${url}`)
//         }
//       />
//     </div>
//   );
// }

// // Example 2: Lesson Share with Custom Embed
// export function LessonShareExample() {
//   const [isShareOpen, setIsShareOpen] = useState(false);

//   return (
//     <div className="p-6">
//       <Card
//         variant="elevated"
//         header={
//           <h3 className="text-xl font-semibold text-black">
//             Lesson: State Management
//           </h3>
//         }
//       >
//         <p className="text-gray-600 mb-4">
//           Understanding how to manage state in React applications effectively.
//         </p>
//         <Button
//           label="Share Lesson"
//           onClick={() => setIsShareOpen(true)}
//           variant="outline"
//         />
//       </Card>

//       <ShareModal
//         isOpen={isShareOpen}
//         onClose={() => setIsShareOpen(false)}
//         title="State Management in React"
//         url="https://example.com/lessons/state-management"
//         description="Master state management patterns in React"
//         showEmbed={true}
//         embedWidth={100}
//         embedHeight={500}
//         onShare={(platform, url) => console.log(`User shared on ${platform}`)}
//       />
//     </div>
//   );
// }

// // Example 3: Assignment Share
// export function AssignmentShareExample() {
//   const [isShareOpen, setIsShareOpen] = useState(false);
//   const [assignmentId] = useState("assign-001");

//   return (
//     <div className="p-6 space-y-4">
//       <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
//         <h3 className="text-lg font-semibold text-black mb-2">
//           Assignment: Build a Todo App
//         </h3>
//         <p className="text-gray-600 mb-4">
//           Create a fully functional todo application with React and local
//           storage.
//         </p>
//         <div className="flex gap-2">
//           <Button label="Start Assignment" variant="primary" />
//           <Button
//             label="Share"
//             onClick={() => setIsShareOpen(true)}
//             variant="outline"
//           />
//         </div>
//       </div>

//       <ShareModal
//         isOpen={isShareOpen}
//         onClose={() => setIsShareOpen(false)}
//         title="Build a Todo App - React Assignment"
//         url={`https://example.com/assignments/${assignmentId}`}
//         description="Interactive assignment: Create a todo application with React"
//         showEmbed={false}
//         onShare={(platform) => {
//           console.log(`Assignment shared via ${platform}`);
//         }}
//       />
//     </div>
//   );
// }

// // Example 4: Certificate Share
// export function CertificateShareExample() {
//   const [isShareOpen, setIsShareOpen] = useState(false);
//   const [certificateUrl] = useState(
//     "https://example.com/certificates/react-pro-2024"
//   );

//   return (
//     <div className="p-6 space-y-4">
//       <Card variant="elevated" className="text-center">
//         <div className="mb-4">
//           <div className="text-6xl mb-2">🏆</div>
//           <h3 className="text-2xl font-bold text-indigo-600 mb-2">
//             Certificate of Completion
//           </h3>
//           <p className="text-gray-600">React Pro Course</p>
//         </div>
//         <Button
//           label="Share Achievement"
//           onClick={() => setIsShareOpen(true)}
//           variant="primary"
//         />
//       </Card>

//       <ShareModal
//         isOpen={isShareOpen}
//         onClose={() => setIsShareOpen(false)}
//         title="I just completed the React Pro Course! 🎉"
//         url={certificateUrl}
//         description="Check out my certificate from the React Pro Course"
//         showEmbed={true}
//         embedHeight={300}
//       />
//     </div>
//   );
// }

// // Example 5: Complete Learning Dashboard
// export default function ShareModalDashboard() {
//   const [shareState, setShareState] = useState({
//     course: false,
//     lesson: false,
//     assignment: false,
//     certificate: false,
//   });

//   const toggleShare = (type: keyof typeof shareState) => {
//     setShareState((prev) => ({
//       ...prev,
//       [type]: !prev[type],
//     }));
//   };

//   const handleShare = (platform: string, url: string) => {
//     console.log(`Content shared via ${platform}: ${url}`);
//   };

//   return (
//     <div className="bg-white min-h-screen p-6">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="mb-8 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Learning Content
//           </h1>
//           <p className="text-gray-600">
//             Share your learning journey with others
//           </p>
//         </div>

//         {/* Course Card */}
//         <div className="mb-8">
//           <h2 className="text-2xl font-bold text-black mb-4">
//             Featured Course
//           </h2>
//           <Card
//             variant="elevated"
//             header={
//               <div className="flex items-center justify-between">
//                 <h3 className="text-xl font-semibold text-black">
//                   React Fundamentals
//                 </h3>
//                 <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
//                   Bestseller
//                 </span>
//               </div>
//             }
//             footer={
//               <div className="flex gap-2">
//                 <Button label="Enroll Now" variant="primary" />
//                 <Button
//                   label="Share"
//                   onClick={() => toggleShare("course")}
//                   variant="outline"
//                 />
//               </div>
//             }
//           >
//             <p className="text-gray-600 mb-3">
//               Master React basics including components, hooks, state management,
//               and more.
//             </p>
//             <div className="flex gap-4 text-sm text-gray-500">
//               <span>⏱️ 40 hours</span>
//               <span>👥 10,000+ students</span>
//               <span>⭐ 4.9/5</span>
//             </div>
//           </Card>
//         </div>

//         {/* Lessons Grid */}
//         <div className="mb-8">
//           <h2 className="text-2xl font-bold text-black mb-4">Recent Lessons</h2>
//           <div className="grid md:grid-cols-2 gap-6">
//             {[
//               {
//                 title: "Understanding Components",
//                 time: "15 min",
//               },
//               {
//                 title: "State Management Basics",
//                 time: "20 min",
//               },
//               {
//                 title: "Hooks Deep Dive",
//                 time: "25 min",
//               },
//               {
//                 title: "Performance Optimization",
//                 time: "18 min",
//               },
//             ].map((lesson, idx) => (
//               <Card key={idx} variant="outlined" hoverable>
//                 <h4 className="font-semibold text-black mb-2">
//                   {lesson.title}
//                 </h4>
//                 <p className="text-sm text-gray-600 mb-4">⏱️ {lesson.time}</p>
//                 <Button
//                   label="Share Lesson"
//                   onClick={() => toggleShare("lesson")}
//                   variant="outline"
//                   className="w-full"
//                 />
//               </Card>
//             ))}
//           </div>
//         </div>

//         {/* Achievements */}
//         <div className="mb-8">
//           <h2 className="text-2xl font-bold text-black mb-4">
//             Your Achievements
//           </h2>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             {[
//               { icon: "🏆", label: "Course Complete" },
//               { icon: "⭐", label: "5 Star Review" },
//               { icon: "🔥", label: "7 Day Streak" },
//               { icon: "🎯", label: "100% Completion" },
//             ].map((achievement, idx) => (
//               <Card
//                 key={idx}
//                 variant="elevated"
//                 className="text-center cursor-pointer hover:shadow-lg transition-shadow"
//               >
//                 <div className="text-4xl mb-2">{achievement.icon}</div>
//                 <p className="text-sm font-medium text-gray-700">
//                   {achievement.label}
//                 </p>
//               </Card>
//             ))}
//           </div>
//         </div>

//         {/* Share Modals */}
//         <ShareModal
//           isOpen={shareState.course}
//           onClose={() => toggleShare("course")}
//           title="React Fundamentals - Master Modern Web Development"
//           url="https://example.com/courses/react-fundamentals"
//           description="Learn React from basics to advanced concepts with hands-on projects"
//           onShare={handleShare}
//         />

//         <ShareModal
//           isOpen={shareState.lesson}
//           onClose={() => toggleShare("lesson")}
//           title="Understanding React Components"
//           url="https://example.com/lessons/understanding-components"
//           description="Deep dive into React components and their lifecycle"
//           onShare={handleShare}
//         />

//         <ShareModal
//           isOpen={shareState.assignment}
//           onClose={() => toggleShare("assignment")}
//           title="Build a Todo App - React Challenge"
//           url="https://example.com/assignments/build-todo-app"
//           description="Create a fully functional todo application"
//           showEmbed={false}
//           onShare={handleShare}
//         />

//         <ShareModal
//           isOpen={shareState.certificate}
//           onClose={() => toggleShare("certificate")}
//           title="I completed React Fundamentals! 🎉"
//           url="https://example.com/certificates/react-fundamentals-2024"
//           description="Check out my certificate of completion"
//           onShare={handleShare}
//         />
//       </div>
//     </div>
//   );
// }