'use client';

import { useState, useEffect } from 'react';
import type { MaterialInfo } from '@/app/upload/page';

type TextPreviewProps = {
  materialInfo: MaterialInfo;
};

export default function TextPreview({ materialInfo }: TextPreviewProps) {
  const [textContent, setTextContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState<string>('medium');
  const [textFormat, setTextFormat] = useState<string>('plain');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lineSpacing, setLineSpacing] = useState<number>(1.6);
  
  // Load text content from file
  useEffect(() => {
    if (materialInfo.files && materialInfo.files.length > 0) {
      const file = materialInfo.files[0];
      console.log(`Processing text file: ${file.name}, type: ${file.type}`);
      
      if (file.type === 'text/plain' || 
          file.type === 'text/markdown' || 
          file.type === 'application/rtf' ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md')) {
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target?.result as string || '');
          setIsLoading(false);
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          setIsLoading(false);
        };
        reader.readAsText(file);
      } else {
        console.warn('File type not supported for text preview:', file.type);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [materialInfo.files]);

  const processText = () => {
    setIsProcessing(true);
    
    // Simulate text processing (formatting, validation, etc.)
    setTimeout(() => {
      setIsProcessing(false);
      // In a real app, you might apply formatting or other transformations here
    }, 1000);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading text content...</p>
      </div>
    );
  }

  if (!textContent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">No Text Content Found</h2>
        <p>Unable to load content from the uploaded text file.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-medium mb-4">Text Processing Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Font Size
            </label>
            <select 
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isProcessing}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Format
            </label>
            <select
              value={textFormat}
              onChange={(e) => setTextFormat(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isProcessing}
            >
              <option value="plain">Plain Text</option>
              <option value="markdown">Markdown</option>
              <option value="formatted">Formatted Text</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Line Spacing: {lineSpacing.toFixed(1)}
            </label>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={lineSpacing}
              onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
              className="w-full"
              disabled={isProcessing}
            />
          </div>
        </div>
        
        <button
          onClick={processText}
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
            'Process Text'
          )}
        </button>
      </div>

      <h3 className="font-medium mb-2">Text Preview</h3>
      
      <div className="border rounded-lg overflow-hidden mb-4">
        <textarea 
          value={textContent}
          onChange={handleTextChange}
          className={`w-full p-4 min-h-[300px] font-${fontSize === 'small' ? 'sm' : fontSize === 'large' ? 'lg' : 'base'}`}
          style={{ 
            resize: 'vertical',
            lineHeight: lineSpacing
          }}
          disabled={isProcessing}
        />
      </div>
      
      <div className="bg-blue-50 p-3 rounded text-sm">
        <h4 className="font-medium text-blue-700 mb-1">Text Processing Notes</h4>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          <li>Changes to the text are automatically saved</li>
          <li>Formatting options will be applied upon processing</li>
          <li>Large files may take a moment to load completely</li>
          {textFormat === 'markdown' && (
            <li>Markdown formatting will be rendered in the final document</li>
          )}
        </ul>
      </div>
    </div>
  );
}