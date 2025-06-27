// /app/admin/materials/page.tsx
'use client';

import { useState, useEffect } from 'react';
import MaterialList from '@/components/upload/MaterialList';
import { MaterialProvider, useMaterial } from '@/context/materialContext';

function MaterialStats() {
  const { materials, isInitialized } = useMaterial();
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div className="bg-white p-3 rounded border">
        <div className="font-medium text-gray-900">Total Materials</div>
        <div className="text-2xl font-bold text-blue-600">{materials.length}</div>
      </div>
      <div className="bg-white p-3 rounded border">
        <div className="font-medium text-gray-900">Features</div>
        <div className="text-xs text-gray-600 mt-1">
          Upload, edit, search, pagination, file & text support
        </div>
      </div>
      <div className="bg-white p-3 rounded border">
        <div className="font-medium text-gray-900">Status</div>
        <div className={isInitialized ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
          {isInitialized ? 'Ready for Upload' : 'Loading...'}
        </div>
      </div>
    </div>
  );
}

function MaterialDataManagerPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Desktop Required</h2>
          <p className="text-gray-600 mb-4">
            The Material Data Manager is optimized for desktop use due to its complex interface and data management features.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">For the best experience:</h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Use a desktop or laptop computer</li>
              <li>• Minimum screen width: 768px</li>
              <li>• Modern web browser recommended</li>
            </ul>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Current screen width: {typeof window !== 'undefined' ? window.innerWidth : 0}px<br />
              Required: 768px or larger
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Material Data Manager</h1>
          <p className="text-gray-600">
            Review and complete material information before uploading to the database
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Tip:</span> Required fields are marked with a red border. 
              Add material details as needed. Save each material individually when complete.
            </p>
          </div>
          <MaterialStats />
        </header>
        <MaterialList />
      </div>
    </div>
  );
}

export default function MaterialDataManagerPageWithProvider() {
  return (
    <MaterialProvider>
      <MaterialDataManagerPage />
    </MaterialProvider>
  );
}
