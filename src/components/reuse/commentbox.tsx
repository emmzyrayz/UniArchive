"use client";

import { useState } from "react";
import { Card, Button, Textarea, Avatar, Badge } from "@/components/UI";
import { LuHeart, LuMessageCircle } from "react-icons/lu";

interface Comment {
  id: string;
  user: {
    name: string;
    avatar?: string;
    role?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  liked?: boolean;
  replies?: Comment[];
}

interface CommentBoxProps {
  comments: Comment[];
  currentUser: {
    name: string;
    avatar?: string;
  };
  onAddComment: (content: string, parentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  placeholder?: string;
  className?: string;
  maxReplyDepth?: number;
}

export default function CommentBox({
  comments,
  currentUser,
  onAddComment,
  onLikeComment,
  onReply,
  onDeleteComment,
  placeholder = "Add a comment...",
  className = "",
  maxReplyDepth = 2,
}: CommentBoxProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment("");
    }
  };

  const handleSubmitReply = (commentId: string) => {
    if (replyContent.trim()) {
      onReply?.(commentId, replyContent.trim());
      setReplyContent("");
      setReplyingTo(null);
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (now.getTime() - commentTime.getTime()) / 1000
    );

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return commentTime.toLocaleDateString();
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const canReply = onReply && depth < maxReplyDepth;

    return (
      <div
        key={comment.id}
        className={`${
          depth > 0 ? "ml-8 mt-4 border-l-2 border-gray-200 pl-4" : ""
        }`}
      >
        <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
          <div className="flex gap-3">
            {/* Avatar */}
            <Avatar
              src={comment.user.avatar}
              alt={comment.user.name}
              size="sm"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold text-gray-900">
                  {comment.user.name}
                </span>
                {comment.user.role && (
                  <Badge
                    label={comment.user.role}
                    color="indigo"
                    variant="soft"
                    size="sm"
                  />
                )}
                <span className="text-sm text-gray-500">
                  {formatTimestamp(comment.timestamp)}
                </span>
              </div>

              {/* Comment Text */}
              <p className="text-gray-700 mb-3 whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-4">
                {/* Like Button */}
                <button
                  onClick={() => onLikeComment(comment.id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    comment.liked
                      ? "text-red-600"
                      : "text-gray-500 hover:text-red-600"
                  }`}
                >
                  <LuHeart
                    className="w-4 h-4"
                    fill={comment.liked ? "currentColor" : "none"}
                  />
                  <span className="font-medium">{comment.likes}</span>
                </button>

                {/* Reply Button */}
                {canReply && (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    <LuMessageCircle className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                )}

                {/* Delete Button (if you need it) */}
                {onDeleteComment && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="mt-4 bg-white rounded-lg border-2 border-indigo-200 p-3">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end mt-3">
                    <Button
                      variant="outline"
                      label="Cancel"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                    />
                    <Button
                      variant="primary"
                      label="Reply"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyContent.trim()}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card variant="elevated" padding="none" className={className}>
      {/* Add Comment Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comments ({comments.length})
        </h3>
        <div className="flex gap-3">
          <Avatar src={currentUser.avatar} alt={currentUser.name} size="md" />
          <div className="flex-1">
            <Textarea
              placeholder={placeholder}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              helperText="Press Enter to add a new line"
            />
            <div className="flex justify-end mt-3">
              <Button
                variant="primary"
                label="Post Comment"
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="p-6">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <LuMessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2 font-medium">No comments yet</p>
            <p className="text-sm text-gray-400">
              Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}
      </div>
    </Card>
  );
}


// Example Usage

// 1. Basic Comment Box
// tsxconst [comments, setComments] = useState<Comment[]>([]);

// const handleAddComment = (content: string) => {
//   const newComment = {
//     id: Date.now().toString(),
//     user: {
//       name: currentUser.name,
//       avatar: currentUser.avatar,
//     },
//     content,
//     timestamp: new Date().toISOString(),
//     likes: 0,
//     liked: false,
//   };
//   setComments([...comments, newComment]);
// };

// const handleLikeComment = (commentId: string) => {
//   setComments(comments.map(c => 
//     c.id === commentId 
//       ? { ...c, likes: c.liked ? c.likes - 1 : c.likes + 1, liked: !c.liked }
//       : c
//   ));
// };

// <CommentBox
//   comments={comments}
//   currentUser={{ name: "John Doe", avatar: "/john.jpg" }}
//   onAddComment={handleAddComment}
//   onLikeComment={handleLikeComment}
// />
// 2. With Replies
// tsxconst handleReply = (commentId: string, content: string) => {
//   setComments(comments.map(comment => {
//     if (comment.id === commentId) {
//       const newReply = {
//         id: `${commentId}-${Date.now()}`,
//         user: currentUser,
//         content,
//         timestamp: new Date().toISOString(),
//         likes: 0,
//         liked: false,
//       };
//       return {
//         ...comment,
//         replies: [...(comment.replies || []), newReply],
//       };
//     }
//     return comment;
//   }));
// };

// <CommentBox
//   comments={comments}
//   currentUser={currentUser}
//   onAddComment={handleAddComment}
//   onLikeComment={handleLikeComment}
//   onReply={handleReply}
//   maxReplyDepth={2}
// />
// 3. Complete Example with All Features
// tsx"use client";

// import { useState } from "react";
// import { CommentBox } from "@/components/complex";

// export default function MaterialDetailPage() {
//   const currentUser = {
//     name: "Emmanuel Okoro",
//     avatar: "/emmanuel.jpg",
//   };

//   const [comments, setComments] = useState([
//     {
//       id: "1",
//       user: {
//         name: "Sarah Johnson",
//         avatar: "/sarah.jpg",
//         role: "Instructor",
//       },
//       content: "Great material! Very helpful for understanding the concepts.",
//       timestamp: new Date(Date.now() - 3600000).toISOString(),
//       likes: 12,
//       liked: false,
//       replies: [
//         {
//           id: "1-1",
//           user: {
//             name: "Mike Chen",
//             avatar: "/mike.jpg",
//           },
//           content: "I agree! The examples are really clear.",
//           timestamp: new Date(Date.now() - 1800000).toISOString(),
//           likes: 3,
//           liked: true,
//         },
//       ],
//     },
//     {
//       id: "2",
//       user: {
//         name: "Lisa Wang",
//         avatar: "/lisa.jpg",
//         role: "Teaching Assistant",
//       },
//       content: "Could you add more practice problems? That would be really helpful for exam prep.",
//       timestamp: new Date(Date.now() - 7200000).toISOString(),
//       likes: 8,
//       liked: true,
//     },
//   ]);

//   const handleAddComment = (content: string) => {
//     const newComment = {
//       id: Date.now().toString(),
//       user: currentUser,
//       content,
//       timestamp: new Date().toISOString(),
//       likes: 0,
//       liked: false,
//     };
//     setComments([newComment, ...comments]);
//   };

//   const handleLikeComment = (commentId: string) => {
//     const updateCommentLike = (comments: Comment[]): Comment[] => {
//       return comments.map(comment => {
//         if (comment.id === commentId) {
//           return {
//             ...comment,
//             likes: comment.liked ? comment.likes - 1 : comment.likes + 1,
//             liked: !comment.liked,
//           };
//         }
//         if (comment.replies) {
//           return {
//             ...comment,
//             replies: updateCommentLike(comment.replies),
//           };
//         }
//         return comment;
//       });
//     };
//     setComments(updateCommentLike(comments));
//   };

//   const handleReply = (commentId: string, content: string) => {
//     const addReply = (comments: Comment[]): Comment[] => {
//       return comments.map(comment => {
//         if (comment.id === commentId) {
//           const newReply = {
//             id: `${commentId}-${Date.now()}`,
//             user: currentUser,
//             content,
//             timestamp: new Date().toISOString(),
//             likes: 0,
//             liked: false,
//           };
//           return {
//             ...comment,
//             replies: [...(comment.replies || []), newReply],
//           };
//         }
//         if (comment.replies) {
//           return {
//             ...comment,
//             replies: addReply(comment.replies),
//           };
//         }
//         return comment;
//       });
//     };
//     setComments(addReply(comments));
//   };

//   const handleDeleteComment = (commentId: string) => {
//     const deleteComment = (comments: Comment[]): Comment[] => {
//       return comments
//         .filter(c => c.id !== commentId)
//         .map(comment => ({
//           ...comment,
//           replies: comment.replies ? deleteComment(comment.replies) : undefined,
//         }));
//     };
//     setComments(deleteComment(comments));
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6">
//       <h1 className="text-3xl font-bold mb-6">Introduction to Algorithms</h1>
      
//       {/* Material content */}
//       <div className="mb-8">
//         {/* ... material content ... */}
//       </div>

//       {/* Comments Section */}
//       <CommentBox
//         comments={comments}
//         currentUser={currentUser}
//         onAddComment={handleAddComment}
//         onLikeComment={handleLikeComment}
//         onReply={handleReply}
//         onDeleteComment={handleDeleteComment}
//         placeholder="Share your thoughts or ask a question..."
//         maxReplyDepth={2}
//       />
//     </div>
//   );
// }
// 4. Material Discussion
// tsx<CommentBox
//   comments={materialComments}
//   currentUser={user}
//   onAddComment={handleAddComment}
//   onLikeComment={handleLike}
//   onReply={handleReply}
//   placeholder="Ask a question or share feedback..."
// />
// 5. Course Announcement Comments
// tsx<CommentBox
//   comments={announcementComments}
//   currentUser={user}
//   onAddComment={handleAddComment}
//   onLikeComment={handleLike}
//   placeholder="Comment on this announcement..."
//   maxReplyDepth={1} // Only allow one level of replies
// />
// 6. Assignment Feedback
// tsx<CommentBox
//   comments={assignmentComments}
//   currentUser={user}
//   onAddComment={handleAddComment}
//   onLikeComment={handleLike}
//   onReply={handleReply}
//   onDeleteComment={canDelete ? handleDelete : undefined}
//   placeholder="Provide feedback or ask for clarification..."
// />
// 🎨 Features:

// ✅ Nested replies - Support for threaded conversations
// ✅ Like/Unlike - Toggle likes with visual feedback
// ✅ User roles - Display role badges (Instructor, TA, etc.)
// ✅ Timestamp formatting - Smart relative time display
// ✅ Reply depth control - Limit how deep replies can go
// ✅ Delete comments - Optional delete functionality
// ✅ Empty state - Helpful message when no comments
// ✅ Comment count - Shows total number of comments
// ✅ Smooth animations - Hover effects and transitions