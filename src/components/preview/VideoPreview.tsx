'use client';

import { useState, useEffect } from 'react';
import type { MaterialInfo } from '@/app/upload/page';

type VideoPreviewProps = {
  materialInfo: MaterialInfo;
};

export const VideoPreview = ({ materialInfo }: VideoPreviewProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoQuality, setVideoQuality] = useState<string>('720p');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  
  // Generate video preview URL
  useEffect(() => {
    if (materialInfo.files && materialInfo.files.length > 0) {
      const file = materialInfo.files[0];
      console.log(`Processing video file: ${file.name}, type: ${file.type}`);
      
      if (file.type.startsWith('video/')) {
        setVideoUrl(URL.createObjectURL(file));
      }
    }
    
    // Cleanup function
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [materialInfo.files, videoUrl]);

  const processVideo = () => {
    setIsProcessing(true);
    
    // Simulate video processing
    setTimeout(() => {
      setIsProcessing(false);
      // In a real app, this would return a new processed video URL
    }, 2000);
  };

  if (!videoUrl) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">No Video Found</h2>
        <p>Unable to generate preview for the uploaded video.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-medium mb-4">Video Processing Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Quality
            </label>
            <select 
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isProcessing}
            >
              <option value="480p">480p (SD)</option>
              <option value="720p">720p (HD)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="2160p">2160p (4K)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Playback Speed: {playbackSpeed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.25"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="w-full"
              disabled={isProcessing}
            />
          </div>
        </div>
        
        <button
          onClick={processVideo}
          disabled={isProcessing}
          className={`px-4 py-2 rounded ${
            isProcessing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isProcessing ? (
            <>
              <span className="inline-block animate-spin mr-2">↻</span>
              Processing...
            </>
          ) : (
            'Process Video'
          )}
        </button>
      </div>

      <h3 className="font-medium mb-2">Video Preview</h3>
      
      <div className="border rounded-lg overflow-hidden mb-4">
        <video 
          src={videoUrl} 
          controls 
          className="w-full h-auto"
          style={{ maxHeight: '480px' }}
        />
      </div>
      
      <div className="bg-blue-50 p-3 rounded text-sm">
        <h4 className="font-medium text-blue-700 mb-1">Video Processing Notes</h4>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          <li>Processing may take several minutes for longer videos</li>
          <li>Optimization helps with smoother playback on all devices</li>
          <li>Original video quality will be preserved in the background</li>
        </ul>
      </div>
    </div>
  );
}