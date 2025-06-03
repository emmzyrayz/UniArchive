'use client';

import Image from 'next/image';
import { useState, useRef, useCallback } from 'react';

type FileUploaderProps = {
  onFilesSelected: (files: File[] | null) => void;
  acceptedTypes?: string;
  maxFileSizeMB?: number;
};

export const FileUploader = ({ 
  onFilesSelected, 
  acceptedTypes = '.pdf,.jpg,.jpeg,.png',
  maxFileSizeMB = 50
}: FileUploaderProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [previews, setPreviews] = useState<{ url: string; type: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file type
      const fileType = file.type;
      const isValidType = 
        fileType.startsWith('image/') || 
        fileType === 'application/pdf' ||
        acceptedTypes.split(',').some(ext => file.name.toLowerCase().endsWith(ext));
      
      // Check file size
      const isValidSize = file.size <= (maxFileSizeMB * 1024 * 1024);
      
      return isValidType && isValidSize;
    });
    
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      onFilesSelected(validFiles);
      generatePreviews(validFiles);
    }
  }, [acceptedTypes, maxFileSizeMB, onFilesSelected]);

  const generatePreviews = (files: File[]) => {
    const newPreviews: { url: string; type: string }[] = [];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push({
            url: e.target.result as string,
            type: file.type.startsWith('image/') ? 'image' : 'file'
          });
          
          if (newPreviews.length === files.length) {
            setPreviews(newPreviews);
          }
        }
      };
      reader.readAsDataURL(file);
    });
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
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    if (!selectedFiles) return;
    
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    
    if (newFiles.length === 0) {
      setSelectedFiles(null);
      setPreviews([]);
      onFilesSelected(null);
    } else {
      setSelectedFiles(newFiles);
      setPreviews(newPreviews);
      onFilesSelected(newFiles);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="mb-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-4 ${
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
          accept={acceptedTypes}
          className="hidden"
          multiple
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
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-600">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            {acceptedTypes.split(',').map(ext => ext.replace('.', '')).join(', ').toUpperCase()} 
            {maxFileSizeMB ? ` (max ${maxFileSizeMB}MB)` : ''}
          </p>
        </div>
      </div>

      {selectedFiles && selectedFiles.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Selected Files ({selectedFiles.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="flex items-start p-3 border rounded bg-gray-50">
                {preview.type === 'image' ? (
                  <div className="relative mr-3">
                    <Image 
                      src={preview.url} 
                      alt={`Preview ${index + 1}`} 
                      className="w-16 h-16 object-cover rounded"
                      width={64}
                      height={64}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-200 border rounded p-2 mr-3">
                    <svg 
                      className="w-8 h-8 text-gray-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{selectedFiles[index].name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFiles[index].size)}</p>
                </div>
                
                <button 
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500 ml-2"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}