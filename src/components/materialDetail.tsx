"use client"

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  LuBookOpen, 
  LuVideo, 
  LuHeadphones, 
  LuDownload, 
  LuHeart, 
  LuShare2, 
  LuBookmark, 
  LuCircleCheck, 
  LuCalendar, 
  LuUser, 
  LuTag, 
  LuEye,
  LuMessageSquare,
  LuThumbsUp,
  LuPlay,
  LuPause,
  LuSkipBack,
  LuSkipForward,
  LuVolume2,
//   LuClock,
  LuFileText
} from 'react-icons/lu';
import { BLOG_DATA, 
    // USERS_DATA,
    //  COMMENTS_DATA,
      getBlogImages, getUserById, getBlogCommentsById, getCommentRepliesById,
    //    type BlogPost, 
    //    type Comment
     } from '@/assets/data/blogData';

// Material Detail Page Component
const MaterialDetailPage = ({ materialId }: { materialId: number }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(245); // Mock duration in seconds

  // Get material data
  const material = BLOG_DATA.find(post => post.id === materialId);
  
  if (!material) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Material Not Found</h1>
          <p className="text-gray-600">The requested material could not be found.</p>
        </div>
      </div>
    );
  }

  const author = getUserById(material.authorId);
  const images = getBlogImages(material.imageIds);
  const comments = getBlogCommentsById(material.id);
  
  // Calculate related/recommended materials
  const relatedMaterials = BLOG_DATA.filter(post => 
    post.id !== material.id && 
    (post.tags.some(tag => material.tags.includes(tag)) || post.authorId === material.authorId)
  ).slice(0, 3);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'platform': return <LuBookOpen className="w-5 h-5" />;
      case 'teacher': return <LuVideo className="w-5 h-5" />;
      case 'student': return <LuHeadphones className="w-5 h-5" />;
      default: return <LuFileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'platform': return 'Text/PDF';
      case 'teacher': return 'Video';
      case 'student': return 'Audio';
      default: return type;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render content based on material type
  const renderContentViewer = () => {
    switch (material.type) {
      case 'platform': // Text/PDF
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* PDF Viewer Placeholder */}
            <div className="mb-6 p-8 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <LuFileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium mb-2">PDF/Document Viewer</p>
              <p className="text-sm text-gray-500">
                This would render the actual PDF content from the server
              </p>
            </div>
            
            {/* Content Preview/Text */}
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{material.title}</h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {material.content}
              </div>
            </div>
          </div>
        );

      case 'teacher': // Video
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Video Player Placeholder */}
            <div className="relative aspect-video bg-gray-900">
              {images[0] ? (
                <Image 
                  src={images[0].src} 
                  alt={images[0].alt}
                  fill
                  className="object-cover opacity-60"
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <LuPlay className="w-10 h-10 text-white ml-1" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white px-4 py-2 rounded text-sm">
                Video Player (ReactPlayer would be integrated here)
              </div>
            </div>
            
            {/* Video Description */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{material.title}</h2>
              <p className="text-gray-600">{material.excerpt}</p>
            </div>
          </div>
        );

      case 'student': // Audio
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Audio Cover/Thumbnail */}
            <div className="relative h-64 bg-gradient-to-br from-green-500 to-green-600">
              {images[0] ? (
                <Image 
                  src={images[0].src} 
                  alt={images[0].alt}
                  fill
                  className="object-cover opacity-50"
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center">
                <LuHeadphones className="w-24 h-24 text-white" />
              </div>
            </div>

            {/* Audio Player Controls */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{material.title}</h2>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
                  <div 
                    className="h-full bg-green-600 transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <button className="text-gray-600 hover:text-gray-900">
                  <LuSkipBack className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                >
                  {isPlaying ? (
                    <LuPause className="w-7 h-7 text-white" />
                  ) : (
                    <LuPlay className="w-7 h-7 text-white ml-1" />
                  )}
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <LuSkipForward className="w-6 h-6" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <LuVolume2 className="w-6 h-6" />
                </button>
              </div>

              {/* Transcript/Summary Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                <p className="text-gray-600 text-sm">{material.excerpt}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {renderContentViewer()}

            {/* Action Buttons Below Content */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSaved
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <LuBookmark className="w-4 h-4" />
                {isSaved ? "Saved" : "Save to Library"}
              </button>

              <button
                onClick={() => setIsCompleted(!isCompleted)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isCompleted
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <LuCircleCheck className="w-4 h-4" />
                {isCompleted ? "Completed" : "Mark as Completed"}
              </button>

              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isLiked
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <LuHeart
                  className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`}
                />
                {isLiked ? "Liked" : "Like"}
              </button>

              <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                <LuShare2 className="w-4 h-4" />
                Share
              </button>

              <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                <LuDownload className="w-4 h-4" />
                Download
              </button>
            </div>

            {/* Comments Section */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
              >
                <LuMessageSquare className="w-5 h-5" />
                Comments ({comments.length})
              </button>

              {showComments && (
                <div className="space-y-4">
                  {comments.length > 0 ? (
                    comments.map((comment) => {
                      const commentAuthor = getUserById(comment.userId);
                      const replies = getCommentRepliesById(comment.id);

                      return (
                        <div
                          key={comment.id}
                          className="border-l-2 border-gray-200 pl-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {commentAuthor?.displayName.charAt(0) || "U"}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {commentAuthor?.displayName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(comment.date)}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm mb-2">
                                {comment.content}
                              </p>
                              <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                                <LuThumbsUp className="w-3 h-3" />
                                {comment.likes}
                              </button>

                              {/* Replies */}
                              {replies.length > 0 && (
                                <div className="mt-3 space-y-3 pl-4 border-l border-gray-200">
                                  {replies.map((reply) => {
                                    const replyAuthor = getUserById(
                                      reply.userId
                                    );
                                    return (
                                      <div
                                        key={reply.id}
                                        className="flex items-start gap-2"
                                      >
                                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                          {replyAuthor?.displayName.charAt(0) ||
                                            "U"}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900 text-sm">
                                              {replyAuthor?.displayName}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {formatDate(reply.date)}
                                            </span>
                                          </div>
                                          <p className="text-gray-700 text-sm">
                                            {reply.content}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Material Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="font-bold text-gray-900 mb-4">Material Details</h3>

              <div className="space-y-4">
                {/* Type */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {getTypeIcon(material.type)}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Type</p>
                    <p className="font-medium text-gray-900">
                      {getTypeLabel(material.type)}
                    </p>
                  </div>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    <LuUser className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Author</p>
                    <p className="font-medium text-gray-900">
                      {author?.displayName || material.author}
                    </p>
                    <p className="text-xs text-gray-500">{author?.role}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    <LuCalendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Published</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(material.date)}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                        <LuHeart className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {material.likes}
                      </p>
                      <p className="text-xs text-gray-500">Likes</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <LuEye className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {material.shares * 50}
                      </p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                        <LuDownload className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {material.shares}
                      </p>
                      <p className="text-xs text-gray-500">Downloads</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                        <LuMessageSquare className="w-4 h-4" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {material.comments}
                      </p>
                      <p className="text-xs text-gray-500">Comments</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <LuTag className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-700">Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {material.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 cursor-pointer transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Related Materials */}
            {relatedMaterials.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  Related Materials
                </h3>
                <div className="space-y-3">
                  {relatedMaterials.map((related) => (
                    <div
                      key={related.id}
                      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 flex-shrink-0">
                        {getTypeIcon(related.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                          {related.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {related.author}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Example usage with dynamic routing
export default MaterialDetailPage;