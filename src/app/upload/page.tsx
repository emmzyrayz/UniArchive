'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/upload/FileUploader';
import { VideoUploader } from '@/components/upload/VideoUploader';
import { TextUploader } from '@/components/upload/TextUploader';
import { InfoForm } from '@/components/upload/Infoform';

// Define material categories and subcategories
export type MaterialCategory = 
  | 'LEARNING_AIDS'
  | 'ACADEMIC_WORK'
  | 'MEDIA'
  | 'EXAMS'
  | 'BOOKS';

export type MaterialSubcategory = 
  | 'LECTURE_NOTE'
  | 'PAST_QUESTION'
  | 'COURSE_MATERIAL'
  | 'ASSIGNMENT'
  | 'TUTORIAL'
  | 'RECORDED_LECTURE'
  | 'PRESENTATION'
  | 'PROJECT'
  | 'LAB_REPORT'
  | 'EBOOK'
  | 'TEXTBOOK'  // Added TEXTBOOK here
  | 'MOCK_EXAM'
  | 'SYLLABUS';

// Video types
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

export type MaterialInfo = {
  university: string;
  faculty: string;
  department: string;
  course: string;
  topic: string;
  category: MaterialCategory | null;
  subcategory: MaterialSubcategory | null;
  files: File[] | null;
  videoSource?: VideoSource | null;
  textContent?: string;
  metadata?: Record<string, string>; // Additional metadata fields
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
    category: null,
    subcategory: null,
    files: null,
    metadata: {}
  });

  // Handle form field changes
  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMaterialInfo({ ...materialInfo, [name]: value });
  };

  // Handle metadata changes
  const handleMetadataChange = (name: string, value: string) => {
    setMaterialInfo(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [name]: value
      }
    }));
  };

  // Set material category and subcategory
  const handleMaterialSelect = (category: MaterialCategory, subcategory: MaterialSubcategory) => {
    setMaterialInfo({ 
      ...materialInfo, 
      category,
      subcategory,
      // Clear previous content
      files: null,
      videoSource: null,
      textContent: undefined,
      metadata: {}
    });
    setCurrentStep(2);
  };

  // Handle file upload
  const handleFilesSelected = (files: File[] | null) => {
    setMaterialInfo({ ...materialInfo, files });
  };

  // Handle video selection
  const handleVideoSelected = (videoSource: VideoSource | null) => {
    if (videoSource) {
      setMaterialInfo({
        ...materialInfo,
        videoSource,
        files: videoSource.type === 'file' ? [videoSource.data as File] : null
      });
    } else {
      setMaterialInfo({
        ...materialInfo,
        videoSource: null,
        files: null
      });
    }
  };

  // Handle text content
  const handleTextContent = useCallback((content: string) => {
    setMaterialInfo(prev => ({ ...prev, textContent: content }));
  }, []);

  // Check if the current material has valid data
  const hasValidData = useCallback(() => {
    const { subcategory, files, videoSource, textContent } = materialInfo;
    
    if (!subcategory) return false;
    
    switch (subcategory) {
      case 'RECORDED_LECTURE':
        return videoSource !== null;
      case 'TEXTBOOK':
      case 'EBOOK':
      case 'LECTURE_NOTE':
      case 'COURSE_MATERIAL':
      case 'ASSIGNMENT':
      case 'PROJECT':
      case 'LAB_REPORT':
      case 'PAST_QUESTION':
      case 'MOCK_EXAM':
      case 'PRESENTATION':
      case 'SYLLABUS':
        return files && files.length > 0;
      case 'TUTORIAL':
        return textContent && textContent.trim() !== '';
      default:
        return false;
    }
  }, [materialInfo]);

  // Navigate to preview page
  const goToPreview = useCallback(() => {
    try {
      // Store in memory instead of localStorage for artifact compatibility
      sessionStorage.setItem('materialInfo', JSON.stringify(materialInfo));
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
    <div className="max-w-4xl mx-auto p-4">
      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <InfoForm 
          materialInfo={materialInfo} 
          onChange={handleInfoChange}
          onMetadataChange={handleMetadataChange}
          onSelectMaterial={handleMaterialSelect} 
        />
      )}

      {/* Step 2: Material Upload */}
      {currentStep === 2 && materialInfo.subcategory && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-6">
            Step 2: Upload Material - {getMaterialLabel(materialInfo.subcategory)}
          </h2>
          
          {/* Additional metadata fields */}
          {renderMetadataFields(materialInfo.subcategory, materialInfo.metadata || {}, handleMetadataChange)}
          
          {/* Upload components */}
          {materialInfo.subcategory === 'RECORDED_LECTURE' ? (
            <VideoUploader onVideoSelected={handleVideoSelected} maxFileSizeMB={500} />
          ) : materialInfo.subcategory === 'TUTORIAL' ? (
            <TextUploader 
              onContentChange={handleTextContent}
              initialContent={materialInfo.textContent}
            />
          ) : (
            <FileUploader 
              onFilesSelected={handleFilesSelected}
              acceptedTypes={getAcceptedFileTypes(materialInfo.subcategory)}
              maxFileSizeMB={getMaxFileSize(materialInfo.subcategory)}
            />
          )}

          <div className="mt-8 flex justify-between">
            <button 
              onClick={goBackToStep1}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
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

// Helper functions
function getMaterialLabel(subcategory: MaterialSubcategory): string {
  const labels: Record<MaterialSubcategory, string> = {
    LECTURE_NOTE: 'Lecture Note',
    PAST_QUESTION: 'Past Question',
    COURSE_MATERIAL: 'Course Material',
    ASSIGNMENT: 'Assignment',
    TUTORIAL: 'Tutorial',
    RECORDED_LECTURE: 'Recorded Lecture',
    PRESENTATION: 'Presentation',
    PROJECT: 'Project',
    LAB_REPORT: 'Lab Report',
    EBOOK: 'E-book',
    TEXTBOOK: 'Textbook',  // Added TEXTBOOK label
    MOCK_EXAM: 'Mock Exam',
    SYLLABUS: 'Syllabus'
  };
  return labels[subcategory];
}

function getAcceptedFileTypes(subcategory: MaterialSubcategory): string {
  switch (subcategory) {
    case 'PRESENTATION':
      return '.pdf,.ppt,.pptx';
    case 'PROJECT':
    case 'LAB_REPORT':
      return '.pdf,.doc,.docx,.zip';
    default:
      return '.pdf,.jpg,.jpeg,.png';
  }
}

function getMaxFileSize(subcategory: MaterialSubcategory): number {
  switch (subcategory) {
    case 'RECORDED_LECTURE':
      return 500;
    case 'PRESENTATION':
    case 'PROJECT':
      return 100;
    default:
      return 50;
  }
}

function renderMetadataFields(
  subcategory: MaterialSubcategory, 
  metadata: Record<string, string>,
  onChange: (name: string, value: string) => void
): React.ReactElement | null {
  const fields: React.ReactElement[] = [];
  
  switch (subcategory) {
    case 'TEXTBOOK':
    case 'EBOOK':
      fields.push(
        <div key="author" className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Author
          </label>
          <input
            type="text"
            value={metadata.author || ''}
            onChange={(e) => onChange('author', e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter author name"
          />
        </div>
      );
      fields.push(
        <div key="isbn" className="mb-4">
          <label className="block text-sm font-medium mb-1">
            ISBN
          </label>
          <input
            type="text"
            value={metadata.isbn || ''}
            onChange={(e) => onChange('isbn', e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter ISBN number"
          />
        </div>
      );
      break;
    
    case 'PAST_QUESTION':
    case 'MOCK_EXAM':
      fields.push(
        <div key="year" className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Year
          </label>
          <input
            type="text"
            value={metadata.year || ''}
            onChange={(e) => onChange('year', e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., 2023"
          />
        </div>
      );
      fields.push(
        <div key="institution" className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Institution
          </label>
          <input
            type="text"
            value={metadata.institution || ''}
            onChange={(e) => onChange('institution', e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., University of Lagos"
          />
        </div>
      );
      break;
    
    case 'PROJECT':
      fields.push(
        <div key="supervisor" className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Supervisor
          </label>
          <input
            type="text"
            value={metadata.supervisor || ''}
            onChange={(e) => onChange('supervisor', e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter supervisor name"
          />
        </div>
      );
      break;
  }
  
  return fields.length > 0 ? (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-medium mb-3">Additional Information</h3>
      {fields}
    </div>
  ) : null;
}