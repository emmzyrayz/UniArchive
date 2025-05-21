'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {PDFPreview} from '@/components/preview/PDFPreview';
import {PhotoPreview} from '@/components/preview/PhotoPreview';
import {VideoPreview} from '@/components/preview/VideoPreview';
import {TextPreview} from '@/components/preview/TextPreview';
import type { MaterialInfo } from '@/app/upload/page';

export default function PreviewPage() {
  const router = useRouter();
  const [materialInfo, setMaterialInfo] = useState<MaterialInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Retrieve material info from localStorage
    const savedMaterialInfo = localStorage.getItem('materialInfo');
    
    if (savedMaterialInfo) {
      try {
        const parsedInfo = JSON.parse(savedMaterialInfo);
        setMaterialInfo(parsedInfo);
      } catch (error) {
        console.error('Error parsing material info:', error);
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleSubmit = () => {
    // Here you would typically send the data to your API
    alert('Material submitted successfully!');
    
    // Clear localStorage
    localStorage.removeItem('materialInfo');
    
    // Redirect to confirmation or dashboard page
    router.push('/dashboard');
  };

  const renderPreviewComponent = () => {
    if (!materialInfo || !materialInfo.materialType) return null;

    switch (materialInfo.materialType) {
      case 'PDF':
        return <PDFPreview materialInfo={materialInfo} />;
      case 'PHOTOS':
        return <PhotoPreview materialInfo={materialInfo} />;
      case 'VIDEO':
        return <VideoPreview materialInfo={materialInfo} />;
      case 'TEXT':
        return <TextPreview materialInfo={materialInfo} />;
      default:
        return <div>Unsupported material type</div>;
    }
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
              <span className="text-gray-500">Material Type:</span> {materialInfo.materialType}
            </div>
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
    </div>
  );
}