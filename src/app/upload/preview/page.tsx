'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FilePreview } from '@/components/preview/filePreview'; // Updated import
import { VideoPreview } from '@/components/preview/VideoPreview';
import { TextPreview } from '@/components/preview/TextPreview';
import type { MaterialInfo } from '@/app/upload/page';
import { DebugPanel } from '@/components/test/debugDataFlow';

export default function PreviewPage() {
  const router = useRouter();
  const [materialInfo, setMaterialInfo] = useState<MaterialInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add this function to convert base64 to file objects
const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

  useEffect(() => {
    const savedMaterialInfo = sessionStorage.getItem('materialInfo');
    
    if (savedMaterialInfo) {
      try {
        const parsedInfo = JSON.parse(savedMaterialInfo);

        // Convert base64 back to files if needed
      if (parsedInfo.filesBase64 && !parsedInfo.files) {
        parsedInfo.files = parsedInfo.filesBase64.map((base64: string, i: number) => 
          base64ToFile(base64, `file-${i}`)
        );
      }
      
        setMaterialInfo(parsedInfo);
      } catch (error) {
        console.error('Error parsing material info:', error);
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleSubmit = () => {
    alert('Material submitted successfully!');
    sessionStorage.removeItem('materialInfo');
    router.push('/dashboard');
  };

  // Helper function to determine material type
  const getMaterialType = (materialInfo: MaterialInfo): 'PDF' | 'PHOTOS' | 'VIDEO' | 'TEXT' | null => {
    if (!materialInfo.subcategory) return null;

    if (materialInfo.subcategory === 'RECORDED_LECTURE') {
      return 'VIDEO';
    }

    if (materialInfo.subcategory === 'TUTORIAL') {
      return 'TEXT';
    }

    if (materialInfo.files && materialInfo.files.length > 0) {
      const firstFile = materialInfo.files[0];
      const fileType = firstFile?.type ? firstFile.type.toLowerCase() : '';
      
      if (fileType.includes('pdf')) {
        return 'PDF';
      } else if (fileType.includes('image')) {
        return 'PHOTOS';
      } else if (fileType.includes('video')) {
        return 'VIDEO';
      }
    }

    // Default to PDF for document-based materials
    if (['LECTURE_NOTE', 'PAST_QUESTION', 'COURSE_MATERIAL', 'ASSIGNMENT', 
         'PRESENTATION', 'PROJECT', 'LAB_REPORT', 'EBOOK', 'TEXTBOOK', 
         'MOCK_EXAM', 'SYLLABUS'].includes(materialInfo.subcategory)) {
      return 'PDF';
    }

    return null;
  };

  const renderPreviewComponent = () => {
    if (!materialInfo || !materialInfo.subcategory) return null;

    const materialType = getMaterialType(materialInfo);
    if (!materialType) return <div>Unable to determine material type</div>;

    switch (materialType) {
      case 'PDF':
        return <FilePreview type="pdf" materialInfo={materialInfo} />;
      case 'PHOTOS':
        return <FilePreview type="image" materialInfo={materialInfo} />;
      case 'VIDEO':
        return <VideoPreview materialInfo={materialInfo} />;
      case 'TEXT':
        return <TextPreview materialInfo={materialInfo} />;
      default:
        return <div>Unsupported material type</div>;
    }
  };

  // Helper function to get subcategory label
  const getSubcategoryLabel = (subcategory: string): string => {
    const labels: Record<string, string> = {
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
      TEXTBOOK: 'Textbook',
      MOCK_EXAM: 'Mock Exam',
      SYLLABUS: 'Syllabus'
    };
    return labels[subcategory] || subcategory;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!materialInfo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">No Material Found</h2>
        <p className="mb-6">It seems you haven&apos;t uploaded any material yet.</p>
        <button 
          onClick={() => router.push('/upload')}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Upload Page
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Review Your Material</h2>
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h3 className="font-medium text-gray-700 mb-2">Material Details</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500">University:</span> {materialInfo.university}
            </div>
            {materialInfo.faculty && (
              <div>
                <span className="text-gray-500">Faculty:</span> {materialInfo.faculty}
              </div>
            )}
            {materialInfo.department && (
              <div>
                <span className="text-gray-500">Department:</span> {materialInfo.department}
              </div>
            )}
            <div>
              <span className="text-gray-500">Course:</span> {materialInfo.course}
            </div>
            <div>
              <span className="text-gray-500">Topic:</span> {materialInfo.topic}
            </div>
            <div>
              <span className="text-gray-500">Material Type:</span> {
                materialInfo.subcategory ? getSubcategoryLabel(materialInfo.subcategory) : 'Not specified'
              }
            </div>
            {/* Display additional metadata */}
            {materialInfo.metadata && Object.entries(materialInfo.metadata).map(([key, value]) => 
              value && (
                <div key={key}>
                  <span className="text-gray-500 capitalize">{key}:</span> {value}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Preview content based on material type */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Preview and Edit</h2>
        {renderPreviewComponent()}
      </div>
      
      <div className="flex justify-between mt-8">
        <button 
          onClick={() => router.push('/upload')}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Back to Upload
        </button>
        <button 
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Submit Material
        </button>
      </div>

      <DebugPanel materialInfo={materialInfo} />
    </div>
  );
}