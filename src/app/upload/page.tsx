'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {PDFUploader} from '@/components/upload/PDFUploader';
import {PhotoUploader} from '@/components/upload/PhotoUploader';
import {VideoUploader} from '@/components/upload/VideoUploader';
import {TextUploader} from '@/components/upload/TextUploader';
import {InfoForm} from '@/components/upload/Infoform';

export type MaterialType = 'PDF' | 'PHOTOS' | 'VIDEO' | 'TEXT';
export type MaterialInfo = {
  university: string;
  faculty: string;
  department: string;
  course: string;
  topic: string;
  materialType: MaterialType | null;
  files: File[] | null;
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
    setMaterialInfo({ ...materialInfo, materialType: type });
    setCurrentStep(2);
  };

  // Handle file upload
  const handleFilesSelected = (files: File[] | null) => {
    setMaterialInfo({ ...materialInfo, files });
  };

  // Handle text content
  const handleTextContent = (content: string) => {
    setMaterialInfo({ ...materialInfo, textContent: content });
  };

  // Navigate to preview page
  const goToPreview = () => {
    // In a real app, you'd save this state to context, Redux, or localStorage
    localStorage.setItem('materialInfo', JSON.stringify(materialInfo));
    router.push('/upload/preview');
  };

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
            <VideoUploader onFilesSelected={handleFilesSelected} />
          )}
          
          {materialInfo.materialType === 'TEXT' && (
            <TextUploader onContentChange={handleTextContent} />
          )}

          <div className="mt-6 flex justify-between">
            <button 
              onClick={() => setCurrentStep(1)} 
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Back
            </button>
            <button 
              onClick={goToPreview} 
              disabled={!materialInfo.files && !materialInfo.textContent}
              className={`px-6 py-2 rounded ${
                materialInfo.files || materialInfo.textContent 
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