'use client';

import React, { useState, useEffect } from 'react';

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Show loading state during device detection
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
    <div className="flex flex-col md:flex-row gap-6 min-h-screen pt-20 bg-gray-50 p-4">
      {/* Main content area - dynamic width based on sidebar state */}
      <div className={`bg-white shadow-md rounded-lg p-6 transition-all duration-300 ${
        isSidebarCollapsed ? 'w-full' : 'w-full md:w-3/5'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Upload Material</h1>
          
          {/* Toggle button - only visible on desktop */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label={isSidebarCollapsed ? "Show guidelines" : "Hide guidelines"}
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${
                isSidebarCollapsed ? '' : 'rotate-180'
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            {isSidebarCollapsed ? 'Show Guidelines' : 'Hide Guidelines'}
          </button>
        </div>
        {children}
      </div>
      
      {/* Collapsible sidebar */}
      <div className={`bg-white shadow-md rounded-lg transition-all duration-300 overflow-hidden ${
        isSidebarCollapsed 
          ? 'w-0 md:w-0 p-0 opacity-0 md:opacity-0' 
          : 'w-full md:w-2/5 p-6 opacity-100'
      }`}>
        <div className="min-w-0">
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
    </div>
  );
}