// /components/schools/UniversityList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import UniversityEditor from './uniEditor';
import { UniversityInput } from '@/models/universitySchema';
import { useAdmin } from '@/context/adminContext';

interface UniversityData {
  name: string;
  state: string;
  city: string;
  abbreviation: string;
  website: string;
}

interface UniversityListProps {
  universities: UniversityData[];
}

export default function UniversityList({ universities }: UniversityListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [localSavedUniversities, setLocalSavedUniversities] = useState<Set<string>>(new Set());
  const itemsPerPage = 5;

  const { 
    uploadUniversity, 
    isLoading, 
    error, 
    universities: savedUniversities,
    clearError 
  } = useAdmin();

  const filteredUniversities = universities.filter(uni =>
    uni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uni.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredUniversities.length / itemsPerPage);
  const currentItems = filteredUniversities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSave = async (data: UniversityInput) => {
    console.log('Saving university data:', JSON.stringify(data, null, 2));
    
    try {
      const success = await uploadUniversity(data);
      
      if (success) {
        // Add to local saved universities set
        setLocalSavedUniversities(prev => new Set(prev).add(data.id));
        alert(`Successfully saved ${data.name}!`);
      } else {
        alert(`Failed to save ${data.name}. Please try again.`);
      }
    } catch (err) {
      console.error('Error saving university:', err);
      alert(`Error saving ${data.name}. Check console for details.`);
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Clear error when component mounts or error changes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or state..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Stats and Pagination */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          Showing {currentItems.length} of {filteredUniversities.length} universities
          {localSavedUniversities.size > 0 && (
            <span className="ml-2 text-green-600">
              ({localSavedUniversities.size} saved locally)
            </span>
          )}
          {savedUniversities.length > 0 && (
            <span className="ml-2 text-blue-600">
              ({savedUniversities.length} in database)
            </span>
          )}
        </div>
        
        {pageCount > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(pageCount, prev + 1))}
              disabled={currentPage === pageCount}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* University List */}
      <div>
        {currentItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg mb-2">No universities found</p>
            <p className="text-sm">Try a different search term or clear your search to see all universities.</p>
          </div>
        ) : (
          currentItems.map((uni, index) => (
            <UniversityEditor 
              key={`${uni.abbreviation}-${index}`} 
              initialData={uni} 
              onSave={handleSave}
              isLoading={isLoading}
              isSaved={localSavedUniversities.has(`${uni.abbreviation}_${uni.name.replace(/\s+/g, '_').toLowerCase()}`)}
            />
          ))
        )}
      </div>

      {/* Saved Universities Summary */}
      {localSavedUniversities.size > 0 && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">
            Saved Universities ({localSavedUniversities.size})
          </h3>
          <p className="text-sm text-green-700">
            Universities have been successfully uploaded to the database. 
            {savedUniversities.length > 0 && (
              <span> Total universities in database: {savedUniversities.length}</span>
            )}
          </p>
          <button
            onClick={() => setLocalSavedUniversities(new Set())}
            className="mt-2 text-sm text-green-600 hover:text-green-800"
          >
            Clear saved status
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Saving university data...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}