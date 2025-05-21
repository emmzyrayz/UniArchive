'use client';

import { useState, useRef } from 'react';

type VideoUploaderProps = {
  onFilesSelected: (files: File[] | null) => void;
};

export default function VideoUploader({ onFilesSelected }: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        onFilesSelected([file]);
        generateVideoPreview(file);
        simulateUpload();
      }
    }
  };

  const generateVideoPreview = (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setVideoPreview(videoUrl);
  };

  const simulateUpload = () => {
    // Simulate upload progress for UI feedback
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        onFilesSelected([file]);
        generateVideoPreview(file);
        simulateUpload();
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setVideoPreview(null);
    setUploadProgress(0);
    onFilesSelected(null);
    
    // Free up memory
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="mb-6">
      {!selectedFile ? (
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
            <p className="text-xs text-gray-500">MP4, MOV, AVI (max 500MB)</p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {videoPreview && (
              <div className="w-full md:w-1/2">
                <video 
                  src={videoPreview} 
                  controls 
                  className="w-full h-auto rounded"
                />
              </div>
            )}
            
            <div className="w-full md:w-1/2 flex flex-col justify-between">
              <div>
                <h3 className="font-medium mb-2">Video Details</h3>
                <p className="text-sm mb-1">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mb-3">
                  {formatFileSize(selectedFile.size)}
                </p>
                
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
              
              <button
                onClick={removeFile}
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded text-sm hover:bg-red-100 transition-colors w-full md:w-auto"
              >
                Remove Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}