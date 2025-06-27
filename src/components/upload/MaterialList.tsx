'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMaterial } from '@/context/materialContext';
import { FileUploader } from './FileUploader';
import { InfoForm } from './Infoform';
import { TextUploader } from './TextUploader';
import { MaterialCategory, MaterialSubcategory, MaterialInfo } from '@/types/materialUpload';
import { User } from '@/context/userContext';

// Props interface for MaterialList
interface MaterialListProps {
  defaultMaterialInfo?: MaterialInfo;
  userProfile?: User | null;
}

export default function MaterialList({ defaultMaterialInfo, userProfile }: MaterialListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateEditor, setShowCreateEditor] = useState(false);
  const itemsPerPage = 10;

  // Initialize material info with defaults or provided values
  const [materialInfo, setMaterialInfo] = useState<MaterialInfo>(
    defaultMaterialInfo || {
      title: '',
      description: '',
      category: 'LEARNING_AIDS' as MaterialCategory,
      subcategory: 'LECTURE_NOTE' as MaterialSubcategory,
      tags: [],
      visibility: 'public',
      authorName: userProfile?.fullName || '',
      authorEmail: userProfile?.email || '',
      authorRole: userProfile?.role || 'contributor',
      school: userProfile?.school || '',
      faculty: userProfile?.faculty || '',
      department: userProfile?.department || '',
      level: userProfile?.level || '',
      semester: '',
      course: '',
      session: '',
      files: null,
      videoSource: null,
      textContent: '',
      topic: '',
      metadata: {}
    }
  );

  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(
    defaultMaterialInfo?.category || 'LEARNING_AIDS'
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<MaterialSubcategory | null>(
    defaultMaterialInfo?.subcategory || 'LECTURE_NOTE'
  );
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [topic, setTopic] = useState(defaultMaterialInfo?.topic || '');

  const {
    materials,
    isLoading,
    error,
    fetchMaterials,
    isInitialized,
    clearError,
    uploadMaterial,
    deleteMaterial,
  } = useMaterial();

  useEffect(() => {
    if (!isInitialized) {
      fetchMaterials();
    }
  }, [isInitialized, fetchMaterials]);

  useEffect(() => {
    if (showCreateEditor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateEditor]);

  // Filter materials by search term (title, course, uploader)
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    return materials.filter(material =>
      (material.materialTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.uploaderName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [materials, searchTerm]);

  const pageCount = Math.ceil(filteredMaterials.length / itemsPerPage);
  const currentItems = filteredMaterials.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Handle material info changes
  const handleMaterialInfoChange = (name: string, value: string) => {
    setMaterialInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle metadata changes
  const handleMetadataChange = (name: string, value: unknown) => {
    setMaterialInfo(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [name]: value
      }
    }));
  };

  // Handle material category/subcategory selection
  const handleMaterialSelection = (category: MaterialCategory, subcategory: MaterialSubcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
  };

  // Handle file selection
  const handleFilesSelected = (files: File[] | null) => {
    setSelectedFiles(files);
  };

  // Handle topic change
  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
  };

  // Reset form state
  const resetFormState = () => {
    setMaterialInfo(defaultMaterialInfo || {
      title: '',
      description: '',
      category: 'LEARNING_AIDS',
      subcategory: 'LECTURE_NOTE',
      tags: [],
      visibility: 'public',
      authorName: userProfile?.fullName || '',
      authorEmail: userProfile?.email || '',
      authorRole: userProfile?.role || 'contributor',
      school: userProfile?.school || '',
      faculty: userProfile?.faculty || '',
      department: userProfile?.department || '',
      level: userProfile?.level || '',
      semester: '',
      course: '',
      session: '',
      files: null,
      videoSource: null,
      textContent: '',
      topic: '',
      metadata: {}
    });
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedFiles(null);
    setTopic('');
  };

  // Handle material creation
  const handleCreateMaterial = async () => {
    if (!selectedFiles || !selectedCategory || !selectedSubcategory) {
      alert('Please fill in all required fields and select files');
      return;
    }

    try {
      // Create FormData object
      const formData = new FormData();
      
      // Add material info
      formData.append('university', materialInfo.school);
      formData.append('faculty', materialInfo.faculty);
      formData.append('department', materialInfo.department);
      formData.append('level', materialInfo.level);
      formData.append('course', materialInfo.course);
      formData.append('category', selectedCategory);
      formData.append('subcategory', selectedSubcategory);
      formData.append('topic', topic);
      
      // Add metadata if exists
      if (materialInfo.metadata) {
        formData.append('metadata', JSON.stringify(materialInfo.metadata));
      }
      
      // Add files
      selectedFiles.forEach((file) => {
        formData.append(`files`, file);
      });

      // Pass FormData directly to uploadMaterial
      await uploadMaterial(formData);
      resetFormState();
      setShowCreateEditor(false);
      fetchMaterials(); // Refresh the list
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  // Check if form is ready to submit
  const isFormValid = () => {
    return (
      materialInfo.school.trim() !== '' &&
      materialInfo.course.trim() !== '' &&
      materialInfo.level.trim() !== '' &&
      selectedCategory &&
      selectedSubcategory &&
      selectedFiles &&
      selectedFiles.length > 0 &&
      topic.trim() !== ''
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-red-700">{error}</p>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">×</button>
          </div>
        </div>
      )}
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p className="text-blue-700">
          Debug: Initialized: {isInitialized ? 'Yes' : 'No'} | Materials: {materials.length} | Filtered: {filteredMaterials.length}
          {userProfile && ` | User: ${userProfile.fullName}`}
        </p>
      </div>
      
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by material title, course, or uploader..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => fetchMaterials()}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
        <button
          onClick={() => setShowCreateEditor(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          + New Material
        </button>
      </div>
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          Showing {currentItems.length} of {filteredMaterials.length} materials
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

      {/* New Material Editor Modal */}
      {showCreateEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-full overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
                <h2 className="text-xl font-bold text-gray-900">Create New Material</h2>
                <button
                  onClick={() => {
                    setShowCreateEditor(false);
                    resetFormState();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Material Editor Content */}
              <div className="p-6 space-y-6">
                {/* Step 1: Basic Information */}
                <InfoForm
                  materialInfo={materialInfo}
                  onChange={handleMaterialInfoChange}
                  onMetadataChange={handleMetadataChange}
                  onSelectMaterial={handleMaterialSelection}
                />

                {/* Step 2: File Upload (only show if category/subcategory selected) */}
                {selectedCategory && selectedSubcategory && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Step 2: Upload Files</h3>
                    <FileUploader
                      onFilesSelected={handleFilesSelected}
                      onTopicChange={handleTopicChange}
                      subcategory={selectedSubcategory}
                      initialTopic={topic}
                    />
                  </div>
                )}

                {/* Step 3: Text Content (optional - you can add TextUploader here if needed) */}
                {selectedCategory && selectedSubcategory && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Step 3: Additional Text Content (Optional)</h3>
                    <TextUploader />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => {
                    setShowCreateEditor(false);
                    resetFormState();
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMaterial}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-blue-400"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? 'Creating...' : 'Create Material'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        {currentItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg mb-2">
              {searchTerm ? 'No materials found matching your search' : 'No materials found'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Try a different search term or clear your search to see all materials.' : 'No materials available.'}
            </p>
          </div>
        ) : (
          currentItems.map(material => (
            <div key={material.muid} className="mb-4 p-4 border rounded-lg bg-white shadow">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-lg">{material.materialTitle}</div>
                  <div className="text-sm text-gray-600">Course: {material.courseName} | Uploaded by: {material.uploaderName}</div>
                  <div className="text-xs text-gray-400">Type: {material.materialType} | Status: {material.status}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {/* TODO: Implement edit modal */}}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMaterial(material.muid)}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                    disabled={isLoading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing material data...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}