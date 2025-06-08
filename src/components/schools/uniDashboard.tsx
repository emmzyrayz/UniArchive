// /components/schools/UniversityDashboard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '@/context/adminContext';

interface UniversityDashboardProps {
  totalUniversities: number;
  className?: string;
}

export default function UniversityDashboard({ 
  totalUniversities, 
  className = "" 
}: UniversityDashboardProps) {
  const { universities, fetchUniversities, isLoading } = useAdmin();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    // Fetch universities when component mounts
    fetchUniversities();
  }, [fetchUniversities]);

  useEffect(() => {
    // Update last updated time when universities change
    if (universities.length > 0) {
      setLastUpdated(new Date());
    }
  }, [universities]);

  const uploadedCount = universities.length;
  const remainingCount = totalUniversities - uploadedCount;
  const progressPercentage = totalUniversities > 0 ? (uploadedCount / totalUniversities) * 100 : 0;

  const refreshData = async () => {
    await fetchUniversities();
    setLastUpdated(new Date());
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 mb-6 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">University Upload System</h2>
          <p className="text-gray-600 mt-1">Manage and upload university data to the database</p>
        </div>
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <svg 
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Total Universities</h3>
          <p className="text-2xl font-bold text-blue-900">{totalUniversities.toLocaleString()}</p>
          <p className="text-xs text-blue-600">Available for upload</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-1">Uploaded</h3>
          <p className="text-2xl font-bold text-green-900">{uploadedCount.toLocaleString()}</p>
          <p className="text-xs text-green-600">Successfully in database</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-800 mb-1">Remaining</h3>
          <p className="text-2xl font-bold text-orange-900">{remainingCount.toLocaleString()}</p>
          <p className="text-xs text-orange-600">Yet to be uploaded</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800 mb-1">Progress</h3>
          <p className="text-2xl font-bold text-purple-900">{progressPercentage.toFixed(1)}%</p>
          <p className="text-xs text-purple-600">Completion rate</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Upload Progress</span>
          <span className="text-sm text-gray-500">{uploadedCount} of {totalUniversities}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Status Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-gray-600">
            <span className="font-medium">Database Status:</span> 
            <span className={`ml-2 ${uploadedCount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
              {uploadedCount > 0 ? `${uploadedCount} universities stored` : 'No universities uploaded yet'}
            </span>
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Last Updated:</span> 
            <span className="ml-2 text-gray-500">
              {lastUpdated.toLocaleString()}
            </span>
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-gray-600">
            <span className="font-medium">Estimated Time:</span> 
            <span className="ml-2 text-gray-500">
              {remainingCount > 0 
                ? `~${Math.ceil(remainingCount / 10)} minutes remaining` 
                : 'Upload complete!'
              }
            </span>
          </p>
          <p className="text-gray-600">
            <span className="font-medium">System Status:</span> 
            <span className={`ml-2 ${isLoading ? 'text-orange-500' : 'text-green-500'}`}>
              {isLoading ? 'Processing...' : 'Ready'}
            </span>
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {progressPercentage === 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="ml-2 text-sm font-medium text-green-800">
              🎉 All universities have been successfully uploaded to the database!
            </span>
          </div>
        </div>
      )}

      {remainingCount > 0 && progressPercentage > 0 && progressPercentage < 100 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="ml-2 text-sm text-blue-800">
              Great progress! {remainingCount} universities remaining. Keep uploading to complete the database.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}