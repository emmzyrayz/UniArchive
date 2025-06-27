'use client';

import { useState, useRef, useEffect } from 'react';

// Supported video platforms
enum VideoPlatform {
  YOUTUBE = 'YouTube',
  VIMEO = 'Vimeo',
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  TIKTOK = 'TikTok',
  TWITTER = 'Twitter',
  TWITCH = 'Twitch',
  DAILYMOTION = 'Dailymotion',
  OTHER = 'Other',
}

// Video metadata interface
interface VideoMetadata {
  title?: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  bitrate?: number;
  fileSize?: number;
  platform?: VideoPlatform;
  originalUrl?: string;
  thumbnailUrl?: string;
}

// Video source type
export type VideoSource = {
  type: 'file' | 'url';
  data: File | string;
  metadata: VideoMetadata;
};

export type VideoUploaderProps = {
  onVideoSelected: (videoSource: VideoSource | null) => void;
  maxFileSizeMB?: number;
};

export const VideoUploader = ({ 
  onVideoSelected, 
  maxFileSizeMB = 500
}: VideoUploaderProps) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<VideoPlatform>(VideoPlatform.YOUTUBE);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Safety check for callback function
  const safeCallCallback = (videoSource: VideoSource | null) => {
    if (typeof onVideoSelected === 'function') {
      onVideoSelected(videoSource);
    } else {
      console.error('onVideoSelected is not a function');
    }
  };

  // Clean up function for memory management
  useEffect(() => {
    return () => {
      if (videoPreview && selectedFile) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview, selectedFile]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check if file is a video
      if (!file.type.startsWith('video/')) {
        setError('Selected file is not a video');
        return;
      }
      
      // Check file size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`File size exceeds the ${maxFileSizeMB}MB limit`);
        return;
      }
      
      setSelectedFile(file);
      generateVideoPreview(file);
      extractFileMetadata(file);
      simulateUpload();
    }
  };

  // Extract metadata from video file
  const extractFileMetadata = async (file: File) => {
    setIsProcessing(true);
    
    // Basic metadata we can get directly
    const metadata: VideoMetadata = {
      title: file.name,
      fileSize: file.size,
      format: file.type.split('/')[1],
    };
    
    // Create a URL for the video to extract additional metadata
    const videoUrl = URL.createObjectURL(file);
    
    // Create a video element to get more metadata
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Return a promise that resolves when metadata is loaded
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        metadata.duration = video.duration;
        metadata.width = video.videoWidth;
        metadata.height = video.videoHeight;
        resolve();
      };
      
      video.onerror = () => {
        console.error('Error loading video metadata');
        resolve();
      };
      
      video.src = videoUrl;
    });
    
    // We would need additional libraries or server-side processing for bitrate
    
    setVideoMetadata(metadata);
    setIsProcessing(false);
    
    // Pass the video source to parent component with safety check
    safeCallCallback({
      type: 'file',
      data: file,
      metadata
    });
  };

  // Generate preview from file
  const generateVideoPreview = (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setVideoPreview(videoUrl);
  };

  // Simulate upload progress for UI feedback
  const simulateUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 300);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (!file.type.startsWith('video/')) {
        setError('Selected file is not a video');
        return;
      }
      
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`File size exceeds the ${maxFileSizeMB}MB limit`);
        return;
      }
      
      setSelectedFile(file);
      generateVideoPreview(file);
      extractFileMetadata(file);
      simulateUpload();
    }
  };

  // Helper functions for file input
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove the current file
  const removeFile = () => {
    setSelectedFile(null);
    setVideoPreview(null);
    setUploadProgress(0);
    setVideoMetadata({});
    safeCallCallback(null);
    
    // Free up memory
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);
    setError(null);
    
    // Auto-detect platform from URL
    const platform = detectPlatformFromUrl(e.target.value);
    if (platform) {
      setSelectedPlatform(platform);
    }
  };

  // Detect platform from URL
  const detectPlatformFromUrl = (url: string): VideoPlatform | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return VideoPlatform.YOUTUBE;
      } else if (hostname.includes('vimeo.com')) {
        return VideoPlatform.VIMEO;
      } else if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) {
        return VideoPlatform.FACEBOOK;
      } else if (hostname.includes('instagram.com')) {
        return VideoPlatform.INSTAGRAM;
      } else if (hostname.includes('tiktok.com')) {
        return VideoPlatform.TIKTOK;
      } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        return VideoPlatform.TWITTER;
      } else if (hostname.includes('twitch.tv')) {
        return VideoPlatform.TWITCH;
      } else if (hostname.includes('dailymotion.com')) {
        return VideoPlatform.DAILYMOTION;
      }
    } catch {
      // Invalid URL - just return null
      return null;
    }
    
    return VideoPlatform.OTHER;
  };

  // Handle platform selection change
  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlatform(e.target.value as VideoPlatform);
  };

  // Process URL based on selected platform
  const processVideoUrl = () => {
    setError(null);
    
    if (!videoUrl.trim()) {
      setError('Please enter a video URL');
      return;
    }
    
    setIsProcessing(true);
    
    // Extract video ID and other platform-specific details
    const processedUrl = videoUrl;
    let videoId = '';
    let embedUrl = '';
    let thumbnailUrl = '';
    
    try {
      // Process URL based on platform
      switch (selectedPlatform) {
        case VideoPlatform.YOUTUBE:
          videoId = extractYouTubeVideoId(videoUrl);
          if (!videoId) {
            throw new Error('Invalid YouTube URL');
          }
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          break;
          
        case VideoPlatform.VIMEO:
          videoId = extractVimeoVideoId(videoUrl);
          if (!videoId) {
            throw new Error('Invalid Vimeo URL');
          }
          embedUrl = `https://player.vimeo.com/video/${videoId}`;
          // Would need API call for thumbnail
          break;
          
        // Add logic for other platforms as needed
        
        default:
          // For unknown platforms, just store the original URL
          embedUrl = videoUrl;
      }
      
      // Create metadata
      const metadata: VideoMetadata = {
        originalUrl: videoUrl,
        platform: selectedPlatform,
        thumbnailUrl
      };
      
      // In a real implementation, we would make API calls to fetch 
      // additional metadata like title, duration, etc.
      
      setVideoMetadata(metadata);
      setVideoPreview(embedUrl);
      simulateUpload();
      
      // Pass the video source to parent component with safety check
      safeCallCallback({
        type: 'url',
        data: processedUrl,
        metadata
      });
      
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to process video URL');
      }
    }
    
    setIsProcessing(false);
  };

  // Extract YouTube video ID from URL
  const extractYouTubeVideoId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  // Extract Vimeo video ID from URL
  const extractVimeoVideoId = (url: string): string => {
    const regExp = /vimeo\.com\/(?:video\/|channels\/\w+\/|groups\/[^\/]+\/videos\/|album\/\d+\/video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[1] : '';
  };

  // Render URL preview based on platform
  const renderUrlPreview = () => {
    if (!videoPreview || !videoMetadata.platform) return null;
    
    switch (videoMetadata.platform) {
      case VideoPlatform.YOUTUBE:
        return (
          <iframe
            src={videoPreview}
            className="w-full h-64 rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
        
      case VideoPlatform.VIMEO:
        return (
          <iframe
            src={videoPreview}
            className="w-full h-64 rounded"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
        
      // Add cases for other platforms as needed
        
      default:
        // For other platforms or direct URLs, try to show as regular video
        return (
          <video 
            src={videoPreview} 
            controls 
            className="w-full h-64 rounded"
            ref={videoRef}
          />
        );
    }
  };

  return (
    <div className="mb-6">
      {/* Tabs for file/URL selection */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'file' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('file')}
        >
          Upload Video File
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'url' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('url')}
        >
          Video URL
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      
      {/* File Upload UI */}
      {activeTab === 'file' && !selectedFile && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center">
            <svg 
              className="w-12 h-12 text-gray-400 mb-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-600">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">MP4, MOV, AVI (max {maxFileSizeMB}MB)</p>
          </div>
        </div>
      )}
      
      {/* URL Input UI */}
      {activeTab === 'url' && !videoPreview && (
        <div className="border rounded-lg p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video Platform
            </label>
            <select
              value={selectedPlatform}
              onChange={handlePlatformChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.values(VideoPlatform).map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video URL
            </label>
            <div className="flex">
              <input
                type="url"
                value={videoUrl}
                onChange={handleUrlChange}
                placeholder={`Enter ${selectedPlatform} video URL`}
                className="flex-1 border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={processVideoUrl}
                disabled={isProcessing}
                className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Load'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {selectedPlatform === VideoPlatform.YOUTUBE && 'Example: https://www.youtube.com/watch?v=VIDEO_ID'}
              {selectedPlatform === VideoPlatform.VIMEO && 'Example: https://vimeo.com/VIDEO_ID'}
              {selectedPlatform === VideoPlatform.FACEBOOK && 'Example: https://www.facebook.com/watch?v=VIDEO_ID'}
              {selectedPlatform === VideoPlatform.INSTAGRAM && 'Example: https://www.instagram.com/p/POST_ID/'}
              {selectedPlatform === VideoPlatform.TIKTOK && 'Example: https://www.tiktok.com/@username/video/VIDEO_ID'}
              {selectedPlatform === VideoPlatform.TWITTER && 'Example: https://twitter.com/username/status/TWEET_ID'}
            </p>
          </div>
        </div>
      )}
      
      {/* Video Preview and Details */}
      {(selectedFile || videoPreview) && (
        <div className="border rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Video Preview */}
            <div className="w-full md:w-1/2">
              {activeTab === 'file' && videoPreview ? (
                <video 
                  src={videoPreview} 
                  controls 
                  className="w-full h-auto rounded"
                  ref={videoRef}
                />
              ) : (
                renderUrlPreview()
              )}
            </div>
            
            {/* Video Details */}
            <div className="w-full md:w-1/2 flex flex-col justify-between">
              <div>
                <h3 className="font-medium mb-2">Video Details</h3>
                
                {activeTab === 'file' && selectedFile && (
                  <>
                    <p className="text-sm mb-1">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </>
                )}
                
                {activeTab === 'url' && (
                  <p className="text-sm mb-1">
                    {selectedPlatform} Video
                    {videoMetadata.title && `: ${videoMetadata.title}`}
                  </p>
                )}
                
                {/* Metadata display */}
                {Object.keys(videoMetadata).length > 0 && (
                  <div className="bg-gray-50 p-3 rounded mb-3 text-xs">
                    <h4 className="font-medium mb-1">Metadata</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {videoMetadata.duration && (
                        <>
                          <span className="text-gray-600">Duration:</span>
                          <span>{Math.round(videoMetadata.duration)}s</span>
                        </>
                      )}
                      {videoMetadata.width && videoMetadata.height && (
                        <>
                          <span className="text-gray-600">Resolution:</span>
                          <span>{videoMetadata.width}x{videoMetadata.height}</span>
                        </>
                      )}
                      {videoMetadata.format && (
                        <>
                          <span className="text-gray-600">Format:</span>
                          <span>{videoMetadata.format}</span>
                        </>
                      )}
                      {videoMetadata.platform && (
                        <>
                          <span className="text-gray-600">Platform:</span>
                          <span>{videoMetadata.platform}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Upload progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={removeFile}
                  className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded text-sm hover:bg-red-100 transition-colors"
                >
                  Remove Video
                </button>
                
                {isProcessing && (
                  <div className="flex items-center text-gray-600 ml-4">
                    <svg 
                      className="animate-spin h-5 w-5 mr-2" 
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing video...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};