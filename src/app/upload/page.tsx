'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {PDFUploader} from '@/components/upload/PDFUploader';
import {PhotoUploader} from '@/components/upload/PhotoUploader';
import {VideoUploader} from '@/components/upload/VideoUploader';
import {TextUploader} from '@/components/upload/TextUploader';
import {InfoForm} from '@/components/upload/Infoform';

// Video types imported from VideoUploader
type VideoPlatform = 'YouTube' | 'Vimeo' | 'Facebook' | 'Instagram' | 'TikTok' | 'Twitter' | 'Twitch' | 'Dailymotion' | 'Other';

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

type VideoSource = {
  type: 'file' | 'url';
  data: File | string;
  metadata: VideoMetadata;
};

export type MaterialType = 'PDF' | 'PHOTOS' | 'VIDEO' | 'TEXT';
export type MaterialInfo = {
  university: string;
  faculty: string;
  department: string;
  course: string;
  topic: string;
  materialType: MaterialType | null;
  files: File[] | null;
  videoSource?: VideoSource | null;
  textContent?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [materialInfo, setMaterialInfo] = useState<MaterialInfo>({
    university: '',
    faculty: '',
    department: '',
    course: '',
    topic: '',
    materialType: null,
    files: null,
  });

  // Handle form field changes
  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMaterialInfo({ ...materialInfo, [name]: value });
  };

  // Set material type
  const handleMaterialTypeSelect = (type: MaterialType) => {
    setMaterialInfo({ 
      ...materialInfo, 
      materialType: type,
      // Clear previous content when switching types
      files: null,
      videoSource: null,
      textContent: undefined
    });
    setCurrentStep(2);
  };

  // Handle file upload
  const handleFilesSelected = (files: File[] | null) => {
    setMaterialInfo({ ...materialInfo, files });
  };

  // Handle video selection - specific for VideoUploader
  const handleVideoSelected = (videoSource: VideoSource | null) => {
    if (videoSource) {
      // If the video is a file, also add it to the files array
      if (videoSource.type === 'file') {
        const file = videoSource.data as File;
        setMaterialInfo({
          ...materialInfo,
          videoSource,
          files: file ? [file] : null
        });
      } else {
        // If it's a URL, just store the videoSource
        setMaterialInfo({
          ...materialInfo,
          videoSource,
          files: null // Clear files array if we have a URL
        });
      }
    } else {
      // If videoSource is null, clear both videoSource and files
      setMaterialInfo({
        ...materialInfo,
        videoSource: null,
        files: null
      });
    }
  };

  // Handle text content - FIXED: Properly wrapped with useCallback and debounced
  const handleTextContent = useCallback((content: string) => {
    // Use requestAnimationFrame to defer the state update
   setMaterialInfo(prev => ({ 
    ...prev, 
    textContent: content
  }));
  }, []);

   // Check if the current material type has valid data
  const hasValidData = useCallback(() => {
    switch (materialInfo.materialType) {
      case 'PDF':
      case 'PHOTOS':
        return materialInfo.files && materialInfo.files.length > 0;
      case 'VIDEO':
        return materialInfo.videoSource !== null;
      case 'TEXT':
        return materialInfo.textContent && materialInfo.textContent.trim() !== '';
      default:
        return false;
    }
  }, [materialInfo.materialType, materialInfo.files, materialInfo.videoSource, materialInfo.textContent]);


  // Navigate to preview page
  // Navigate to preview page
  const goToPreview = useCallback(() => {
    // Save the complete material info to localStorage
    try {
      localStorage.setItem('materialInfo', JSON.stringify(materialInfo));
      router.push('/upload/preview');
    } catch (error) {
      console.error('Error saving material info:', error);
      alert('Error saving data. Please try again.');
    }
  }, [materialInfo, router]);

  const goBackToStep1 = useCallback(() => {
    setCurrentStep(1);
  }, []);

  return (
    <div>
      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <InfoForm 
          materialInfo={materialInfo} 
          onChange={handleInfoChange} 
          onSelectMaterialType={handleMaterialTypeSelect} 
        />
      )}

      {/* Step 2: Material Upload */}
      {currentStep === 2 && materialInfo.materialType && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Step 2: Upload {materialInfo.materialType} Material
          </h2>
          
          {materialInfo.materialType === 'PDF' && (
            <PDFUploader onFilesSelected={handleFilesSelected} />
          )}
          
          {materialInfo.materialType === 'PHOTOS' && (
            <PhotoUploader onFilesSelected={handleFilesSelected} />
          )}
          
          {materialInfo.materialType === 'VIDEO' && (
            <VideoUploader onVideoSelected={handleVideoSelected} maxFileSizeMB={500} />
          )}
          
          {materialInfo.materialType === 'TEXT' && (
            <TextUploader 
              onContentChange={handleTextContent}
              initialContent={materialInfo.textContent}
            />
          )}

          <div className="mt-6 flex justify-between">
            <button 
              onClick={goBackToStep1}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Back
            </button>
            <button 
              onClick={goToPreview} 
              disabled={!hasValidData()}
              className={`px-6 py-2 rounded ${
                hasValidData()
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Continue to Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );

}