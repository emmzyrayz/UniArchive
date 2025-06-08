// /components/schools/UniversityList.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import UniversityEditor from './uniEditor';
import { UniversityInput } from '@/models/universitySchema';
import { useAdmin } from '@/context/adminContext';
import { generateUniversityId } from '@/utils/generateId';

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

type TabType = 'all' | 'uploaded' | 'pending' | 'new';

export default function UniversityList({ universities }: UniversityListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [localSavedUniversities, setLocalSavedUniversities] = useState<Set<string>>(new Set());
  const [defaultTabSet, setDefaultTabSet] = useState(false);
  const itemsPerPage = 5;

  const { 
    uploadUniversity, 
    updateUniversity,
    isLoading, 
    error, 
    universities: savedUniversities,
    clearError,
    fetchUniversities,
    isInitialized
  } = useAdmin();

  // Manual fetch on component mount - only if not already initialized
  useEffect(() => {
    if (!isInitialized) {
      console.log('University list initializing - fetching data...');
      fetchUniversities();
    } else {
      console.log(`University list loaded with ${savedUniversities.length} saved universities`);
    }
  }, [isInitialized, fetchUniversities, savedUniversities.length]);

  // Set activeTab to 'uploaded' if there are saved universities
  useEffect(() => {
    if (isInitialized && savedUniversities.length > 0 && !defaultTabSet) {
      console.log(`Setting default tab to 'uploaded' - found ${savedUniversities.length} universities`);
      setActiveTab('uploaded');
      setDefaultTabSet(true);
    }
  }, [isInitialized, savedUniversities.length, defaultTabSet]);

  // FIXED: Merge and deduplicate universities from both sources
  const mergedUniversities = useMemo(() => {
    interface MergedUniversity {
      name: string;
      state: string;
      city: string;
      abbreviation: string;
      website: string;
      universityId: string;
      source: 'props' | 'database' | 'merged';
      isInDatabase: boolean;
      isLocallySaved: boolean;
      existingUniversity: UniversityInput | null;
      status: 'uploaded' | 'pending' | 'new';
    }

    const universityMap = new Map<string, MergedUniversity>();

    // First, add all universities from props (static data)
    universities.forEach(uni => {
      const universityId = generateUniversityId(uni.abbreviation);
      universityMap.set(universityId, {
        ...uni,
        universityId,
        source: 'props',
        isInDatabase: false,
        isLocallySaved: localSavedUniversities.has(universityId),
        existingUniversity: null,
        status: 'new' as const
      });
    });

    // Then, update with data from database (this will overwrite if same ID exists)
    savedUniversities.forEach(uni => {
      const existing = universityMap.get(uni.id);
      
      if (existing) {
        // University exists in both sources - merge the data
        universityMap.set(uni.id, {
          name: uni.name,
          state: uni.location, // Map location to state
          city: uni.location.split(',')[0] || uni.location, // Extract city from location
          abbreviation: uni.psid || existing.abbreviation,
          website: uni.website,
          universityId: uni.id,
          source: 'merged',
          isInDatabase: true,
          isLocallySaved: localSavedUniversities.has(uni.id),
          existingUniversity: uni,
          status: 'uploaded' as const
        });
      } else {
        // University only exists in database
        universityMap.set(uni.id, {
          name: uni.name,
          state: uni.location,
          city: uni.location.split(',')[0] || uni.location,
          abbreviation: uni.psid || uni.name.split(' ').map(w => w[0]).join('').toUpperCase(),
          website: uni.website,
          universityId: uni.id,
          source: 'database',
          isInDatabase: true,
          isLocallySaved: localSavedUniversities.has(uni.id),
          existingUniversity: uni,
          status: 'uploaded' as const
        });
      }
    });

    // Update status for locally saved universities
    universityMap.forEach((uni, id) => {
      if (localSavedUniversities.has(id) && !uni.isInDatabase) {
        uni.status = 'pending';
        uni.isLocallySaved = true;
      }
    });

    const result = Array.from(universityMap.values());
    console.log(`Merged universities: ${result.length} total, sources:`, 
      result.reduce((acc, uni) => {
        acc[uni.source] = (acc[uni.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    );
    
    return result;
  }, [universities, savedUniversities, localSavedUniversities]);

  // Filter universities based on active tab and search term
  const filteredUniversities = useMemo(() => {
    let filtered = mergedUniversities;

    // Filter by tab
    switch (activeTab) {
      case 'uploaded':
        filtered = filtered.filter(uni => uni.isInDatabase);
        break;
      case 'pending':
        filtered = filtered.filter(uni => uni.isLocallySaved && !uni.isInDatabase);
        break;
      case 'new':
        filtered = filtered.filter(uni => !uni.isInDatabase && !uni.isLocallySaved);
        break;
      case 'all':
      default:
        // No additional filtering needed
        break;
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(uni =>
        uni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [mergedUniversities, activeTab, searchTerm]);

  // Tab counts for display
  const tabCounts = useMemo(() => {
    const uploaded = mergedUniversities.filter(uni => uni.isInDatabase).length;
    const pending = mergedUniversities.filter(uni => uni.isLocallySaved && !uni.isInDatabase).length;
    const newCount = mergedUniversities.filter(uni => !uni.isInDatabase && !uni.isLocallySaved).length;
    
    return {
      all: mergedUniversities.length,
      uploaded,
      pending,
      new: newCount
    };
  }, [mergedUniversities]);

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
        
        // Refresh universities to update the database state
        await fetchUniversities();
      } else {
        alert(`Failed to save ${data.name}. Please try again.`);
      }
    } catch (err) {
      console.error('Error saving university:', err);
      alert(`Error saving ${data.name}. Check console for details.`);
    }
  };

  const handleUpdate = async (data: UniversityInput) => {
    try {
      const success = await updateUniversity(data.id, data);
      if (success) {
        alert(`Successfully updated ${data.name}!`);
        // Refresh the university list
        await fetchUniversities();
      } else {
        alert(`Failed to update ${data.name}. Please try again.`);
      }
    } catch (err) {
      console.error('Error updating university:', err);
      alert(`Error updating ${data.name}. Check console for details.`);
    }
  };

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Clear error when component mounts or error changes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Loading state for initial data fetch
  if (!isInitialized) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading university data...</span>
        </div>
      </div>
    );
  }

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

      {/* Debug Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p className="text-blue-700">
          Debug: Initialized: {isInitialized ? 'Yes' : 'No'} | 
          Saved Universities: {savedUniversities.length} | 
          Props Universities: {universities.length} |
          Merged Universities: {mergedUniversities.length} |
          Active Tab: {activeTab}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Universities', count: tabCounts.all },
              { key: 'uploaded', label: 'Uploaded', count: tabCounts.uploaded },
              { key: 'pending', label: 'Pending Upload', count: tabCounts.pending },
              { key: 'new', label: 'New', count: tabCounts.new },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, state, or city..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Refresh Button */}
      <div className="mb-6">
        <button
          onClick={() => fetchUniversities()}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Stats and Pagination */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          Showing {currentItems.length} of {filteredUniversities.length} universities
          {activeTab !== 'all' && (
            <span className="ml-2 text-blue-600">
              (filtered by {activeTab})
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
            <p className="text-lg mb-2">
              {searchTerm 
                ? 'No universities found matching your search' 
                : `No ${activeTab === 'all' ? '' : activeTab} universities found`
              }
            </p>
            <p className="text-sm">
              {searchTerm 
                ? 'Try a different search term or clear your search to see all universities.'
                : activeTab !== 'all' 
                  ? `Switch to "All Universities" tab to see all available options.`
                  : 'No universities available.'
              }
            </p>
          </div>
        ) : (
          currentItems.map((uni) => (
            <UniversityEditor 
              key={`${uni.universityId}-${uni.source}`} // Use unique key
              initialData={{
                name: uni.name,
                state: uni.state,
                city: uni.city,
                abbreviation: uni.abbreviation,
                website: uni.website
              }}
              onSave={handleSave}
              onUpdate={handleUpdate}
              isLoading={isLoading}
              isSaved={uni.isInDatabase || uni.isLocallySaved}
              existingUniversity={uni.existingUniversity}
              mode={uni.existingUniversity ? 'edit' : 'create'}
            />
          ))
        )}
      </div>

      {/* Summary Cards */}
      {isInitialized && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Database Summary */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">
              Database Status
            </h3>
            <p className="text-sm text-blue-700">
              {tabCounts.uploaded} universities uploaded to database
            </p>
            {tabCounts.pending > 0 && (
              <p className="text-sm text-yellow-700 mt-1">
                {tabCounts.pending} pending upload
              </p>
            )}
          </div>

          {/* Local Summary */}
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">
              Local Progress
            </h3>
            <p className="text-sm text-green-700">
              {localSavedUniversities.size} universities saved this session
            </p>
            {localSavedUniversities.size > 0 && (
              <button
                onClick={() => setLocalSavedUniversities(new Set())}
                className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
              >
                Clear session progress
              </button>
            )}
          </div>

          {/* Remaining Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">
              Remaining Work
            </h3>
            <p className="text-sm text-gray-700">
              {tabCounts.new} new universities to process
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Total progress: {Math.round((tabCounts.uploaded / tabCounts.all) * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing university data...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}