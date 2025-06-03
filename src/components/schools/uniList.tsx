// /components/schools/UniversityList.tsx
'use client';

import React, { useState } from 'react';
import UniversityEditor from './uniEditor';
import { UniversityInput } from '@/models/universitySchema';

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
  const [savedUniversities, setSavedUniversities] = useState<Set<string>>(new Set());
  const itemsPerPage = 5;

  const filteredUniversities = universities.filter(uni =>
    uni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uni.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredUniversities.length / itemsPerPage);
  const currentItems = filteredUniversities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSave = (data: UniversityInput) => {
    console.log('Saving university data:', JSON.stringify(data, null, 2));
    
    // Add to saved universities set
    setSavedUniversities(prev => new Set(prev).add(data.id));
    
    // In a real app, you would send this to your backend API
    // Example API call:
    // try {
    //   const response = await fetch('/api/universities', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(data)
    //   });
    //   if (response.ok) {
    //     alert(`Successfully saved ${data.name}`);
    //   }
    // } catch (error) {
    //   console.error('Error saving university:', error);
    // }
    
    alert(`Saved data for ${data.name}! Check console for details.`);
  };

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or state..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          Showing {currentItems.length} of {filteredUniversities.length} universities
          {savedUniversities.size > 0 && (
            <span className="ml-2 text-green-600">
              ({savedUniversities.size} saved)
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
            />
          ))
        )}
      </div>

      {savedUniversities.size > 0 && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">Saved Universities ({savedUniversities.size})</h3>
          <p className="text-sm text-green-700">
            Universities have been saved to the console. In a production environment, 
            these would be sent to your backend API for database storage.
          </p>
          <button
            onClick={() => setSavedUniversities(new Set())}
            className="mt-2 text-sm text-green-600 hover:text-green-800"
          >
            Clear saved status
          </button>
        </div>
      )}
    </div>
  );
}