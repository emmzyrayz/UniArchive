'use client';

import { Loading } from '@/components/reuse/loading';
import React, { useState, useEffect, createContext, useContext } from 'react';

interface UploadLayoutProps {
  children: React.ReactNode;
}

// Create context for guidelines toggle
const GuidelinesContext = createContext<{
  toggleGuidelines: () => void;
  isGuidelinesOpen: boolean;
} | null>(null);

// Hook to use guidelines context
export const useGuidelines = () => {
  const context = useContext(GuidelinesContext);
  if (!context) {
    throw new Error('useGuidelines must be used within GuidelinesProvider');
  }
  return context;
};

export default function UploadLayout({ children }: UploadLayoutProps) {
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      // Check screen size (mobile is typically < 768px)
      const isSmallScreen = window.innerWidth < 768;
      
       // Check user agent for mobile devices
      const userAgent = navigator.userAgent || navigator.vendor || '';
      
      // Check if window has opera property
      const windowWithOpera = window as typeof window & { opera?: string };
      const operaAgent = windowWithOpera.opera || '';
      
      const fullUserAgent = userAgent || operaAgent;
      
      
      // More specific mobile detection (excluding tablets)
      const isPhone = /android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(fullUserAgent.toLowerCase());
      
      
      // Check for touch capability with small screen
      const isTouchSmallScreen = isSmallScreen && 'ontouchstart' in window;
      
      // Consider it mobile if it's a phone OR has small screen with touch
      setIsMobile(isPhone || (isTouchSmallScreen && isSmallScreen));
      setIsLoading(false);
    };

    checkDevice();
    
    // Re-check on window resize
    const handleResize = () => {
      checkDevice();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to toggle guidelines - will be passed to children via context or props
  const toggleGuidelines = () => {
    setIsGuidelinesOpen(!isGuidelinesOpen);
  };

  const closeGuidelines = () => {
    setIsGuidelinesOpen(false);
  };

  // Show loading state during device detection
  if (isLoading) {
    return <Loading />;
  }

  // Show mobile restriction message
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          {/* Mobile icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Better Experience Awaits!
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            For the best material upload experience with drag & drop, multiple file selection, and enhanced preview features, we recommend using a tablet or desktop computer.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Drag & Drop</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Multi-select</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Large Preview</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Faster Processing</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-6 text-gray-500">
              {/* Tablet icon */}
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">Tablet</span>
              </div>
              
              {/* Desktop icon */}
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">Desktop</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Switch to a larger device and return to continue uploading your materials
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal layout for tablets and desktop
  return (
    <GuidelinesContext.Provider value={{ toggleGuidelines, isGuidelinesOpen }}>
      <div className="relative h-[80vh] pt-[100px] bg-gray-50 p-4">
        {/* Main content area */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Upload Material</h1>
              
              {/* Toggle button */}
              <button
                onClick={toggleGuidelines}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label={isGuidelinesOpen ? "Hide guidelines" : "Show guidelines"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isGuidelinesOpen ? 'Hide Guidelines' : 'Show Guidelines'}
              </button>
            </div>
            
            {/* Children can now access guidelines context */}
            {children}
          </div>
        </div>
      
      {/* Absolute positioned guidelines panel */}
      <div className={`fixed top-0 right-0 h-full w-4/5 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        isGuidelinesOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header with close button */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Upload Guidelines</h2>
            <button
              onClick={closeGuidelines}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close guidelines"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step-by-step process */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-blue-600">Upload Process</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <h4 className="font-medium">Fill Basic Information</h4>
                    <p className="text-sm text-gray-600">Enter university, faculty, department, course, and topic details. Select material category and subcategory.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <h4 className="font-medium">Upload Material</h4>
                    <p className="text-sm text-gray-600">Upload files, videos, or enter text content based on your selected material type. Add any additional metadata.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <h4 className="font-medium">Preview & Submit</h4>
                    <p className="text-sm text-gray-600">Review your material, make any final adjustments, and submit for processing.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Material types and requirements */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-green-600">Material Types & Requirements</h3>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">📄 Documents (PDF, DOC, Images)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Lecture Notes, Course Materials, Assignments</li>
                    <li>• Past Questions, Mock Exams, Syllabi</li>
                    <li>• Projects, Lab Reports, Presentations</li>
                    <li>• Max size: 50-100MB depending on type</li>
                  </ul>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">📚 Books (PDF, EPUB)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Textbooks and E-books</li>
                    <li>• Requires author and ISBN information</li>
                    <li>• Ensure you have rights to share the content</li>
                    <li>• Max size: 100MB</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">🎥 Recorded Lectures (MP4, MOV, AVI)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Video files or YouTube/Vimeo links</li>
                    <li>• Max duration: 30 minutes per file</li>
                    <li>• Max size: 500MB</li>
                    <li>• Auto-generated subtitles available</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">📝 Tutorials (Text Content)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Rich text formatting supported</li>
                    <li>• Links and basic formatting allowed</li>
                    <li>• Can be edited after submission</li>
                    <li>• Searchable and indexed content</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* General rules */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-orange-600">General Rules & Guidelines</h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-0.5">⚠️</span>
                    <span>Ensure content doesn&apos;t violate copyright laws</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-0.5">📏</span>
                    <span>Follow file size limits for optimal processing</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-0.5">🔒</span>
                    <span>Information provided will be used according to our privacy policy</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-0.5">✅</span>
                    <span>All materials are reviewed before being made available</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* File format support */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-purple-600">Supported File Formats</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Documents</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>PDF, DOC, DOCX</div>
                    <div>JPG, PNG, JPEG, WEBP</div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Presentations</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>PPT, PPTX, PDF</div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Archives</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>ZIP (for projects)</div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Videos</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>MP4, MOV, AVI</div>
                    <div>YouTube, Vimeo links</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-indigo-600">Pro Tips</h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-indigo-600 mt-0.5">💡</span>
                    <span>Clear, descriptive topics help others find your materials</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-indigo-600 mt-0.5">🏷️</span>
                    <span>Fill in metadata fields for better organization</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-indigo-600 mt-0.5">📱</span>
                    <span>Use drag & drop for faster file uploads</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-indigo-600 mt-0.5">👀</span>
                    <span>Preview your materials before submitting</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when guidelines are open */}
      {isGuidelinesOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={closeGuidelines}
        />
      )}
      </div>
    </GuidelinesContext.Provider>
  );
}