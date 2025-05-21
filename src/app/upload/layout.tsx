'use client';

import React from 'react';

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-screen bg-gray-50 p-4">
      {/* Main content area - 60% width */}
      <div className="w-full md:w-3/5 bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Upload Material</h1>
        {children}
      </div>
      
      {/* Important info sidebar - 40% width */}
      <div className="w-full md:w-2/5 bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Guidelines</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">General Rules</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Files must be under 50MB for optimal processing</li>
            <li>Ensure your content doesn&apos;t violate copyright laws</li>
            <li>Information provided will be used according to our privacy policy</li>
          </ul>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">PDF Uploads</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>We support PDFs up to 100 pages</li>
            <li>You&apos;ll be able to rearrange pages in the preview step</li>
            <li>Text in PDFs will be made searchable through OCR</li>
          </ol>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Photo Uploads</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Supported formats: JPG, PNG, WEBP</li>
            <li>You can upload multiple photos at once</li>
            <li>Images can be enhanced in the preview step</li>
          </ol>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Video Uploads</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Supported formats: MP4, MOV, AVI</li>
            <li>Maximum duration: 30 minutes</li>
            <li>Videos will be processed for optimal streaming</li>
          </ol>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Text Content</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Rich text formatting is supported</li>
            <li>You can include links and basic formatting</li>
            <li>Content can be edited after submission</li>
          </ol>
        </div>
      </div>
    </div>
  );
}