// Debug component to help understand data flow
// Add this to your preview page temporarily for debugging

'use client';

import { useState, useEffect } from 'react';
import type { MaterialInfo } from '@/app/upload/page';

type DebugPanelProps = {
  materialInfo: MaterialInfo;
};

export const DebugPanel = ({ materialInfo }: DebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStorageData, setLocalStorageData] = useState<string>('');

  useEffect(() => {
    // Get data from localStorage for comparison
    const stored = localStorage.getItem('materialInfo');
    setLocalStorageData(stored || 'No data in localStorage');
  }, []);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-red-500 text-white px-4 py-2 rounded shadow-lg hover:bg-red-600"
        >
          Debug Data
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl max-h-96 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Debug Information</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-green-600">Material Info (Props):</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(materialInfo, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-blue-600">localStorage Data:</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {localStorageData}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-purple-600">Key Checks:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Material Type: <strong>{materialInfo.materialType || 'None'}</strong></li>
              <li>Has textContent: <strong>{materialInfo.textContent ? 'Yes' : 'No'}</strong></li>
              <li>textContent length: <strong>{materialInfo.textContent?.length || 0}</strong></li>
              <li>Has files: <strong>{materialInfo.files?.length ? `Yes (${materialInfo.files.length})` : 'No'}</strong></li>
              <li>Has videoSource: <strong>{materialInfo.videoSource ? 'Yes' : 'No'}</strong></li>
            </ul>
          </div>
          
          {materialInfo.textContent && (
            <div>
              <h4 className="font-semibold text-orange-600">Text Content Preview:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
                {materialInfo.textContent.substring(0, 500)}
                {materialInfo.textContent.length > 500 ? '...' : ''}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};