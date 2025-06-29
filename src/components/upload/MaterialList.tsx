'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMaterial } from '@/context/materialContext';
import { MaterialEditor, MaterialEditorType } from './materialEditor';
import { MaterialCategory, MaterialSubcategory, MaterialInfo, VideoSource, userRole } from '@/types/materialUpload';
import { User } from '@/context/userContext';

interface MaterialItem {
  muid: string;
  materialTitle: string;
  materialDescription?: string;
  category?: MaterialCategory;
  subcategory?: MaterialSubcategory;
  tags?: string[];
  isPublic?: boolean;
  uploaderName: string;
  authorEmail?: string;
  authorRole?: userRole;
  schoolName?: string;
  facultyName?: string;
  departmentName?: string;
  level?: string;
  semester?: string;
  courseName: string;
  session?: string;
  fileUrl?: string;
  materialType: 'PDF' | 'IMAGE' | 'VIDEO' | 'TEXT';
  textContent?: string;
  topic?: string;
  metadata?: Record<string, unknown>;
  status?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Props interface for MaterialList
interface MaterialListProps {
  defaultMaterialInfo?: MaterialInfo;
  userProfile?: User | null;
}

export default function MaterialList({ defaultMaterialInfo, userProfile }: MaterialListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateEditor, setShowCreateEditor] = useState(false);
  const [editorType, setEditorType] = useState<MaterialEditorType>('file');
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const itemsPerPage = 10;

  // Initialize material info with defaults or provided values
  const [materialInfo, setMaterialInfo] = useState<MaterialInfo>(() => {
    const currentYear = new Date().getFullYear();
    const academicSession = `${currentYear}/${currentYear + 1}`;
    
    return defaultMaterialInfo || {
      title: '',
      description: '',
      category: null,
      subcategory: null,
      tags: [],
      visibility: 'public',
      authorName: userProfile?.fullName || '',
      authorEmail: userProfile?.email || '',
      authorRole: userProfile?.role || 'student',
      school: userProfile?.school || '',
      faculty: userProfile?.faculty || '',
      department: userProfile?.department || '',
      level: userProfile?.level || '',
      semester: '',
      uploadedFileUrl: '',
      course: '',
      session: academicSession,
      files: null,
      videoSource: null,
      textContent: '',
      topic: '',
      metadata: {
        upid: userProfile?.upid || '',
        uuid: userProfile?.uuid || '',
        regNumber: userProfile?.regNumber || '',
        isVerified: userProfile?.isVerified?.toString() || 'false',
        phone: userProfile?.phone || '',
        gender: userProfile?.gender || '',
        dob: userProfile?.dob ? userProfile.dob.toISOString() : '',
      }
    };
  });

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
  const handleMetadataChange = (name: string, value: string) => {
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
    setMaterialInfo(prev => ({
      ...prev,
      category,
      subcategory
    }));
  };

  // Handle file selection
  const handleFilesSelected = (files: File[] | null) => {
    setMaterialInfo(prev => ({
      ...prev,
      files
    }));
  };

  // Handle video selection
  const handleVideoSelected = (videoSource: VideoSource | null) => {
    setMaterialInfo(prev => ({
      ...prev,
      videoSource
    }));
  };

  // Handle topic change
  const handleTopicChange = (topic: string) => {
    setMaterialInfo(prev => ({
      ...prev,
      topic
    }));
  };

  // Handle content change
  const handleContentChange = (content: string) => {
    setMaterialInfo(prev => ({
      ...prev,
      textContent: content
    }));
  };

  // Reset form state
  const resetFormState = () => {
    const currentYear = new Date().getFullYear();
    const academicSession = `${currentYear}/${currentYear + 1}`;
    
    setMaterialInfo({
      title: '',
      description: '',
      category: null,
      subcategory: null,
      tags: [],
      visibility: 'public',
      authorName: userProfile?.fullName || '',
      authorEmail: userProfile?.email || '',
      authorRole: userProfile?.role || 'student',
      school: userProfile?.school || '',
      faculty: userProfile?.faculty || '',
      department: userProfile?.department || '',
      level: userProfile?.level || '',
      semester: '',
      course: '',
      uploadedFileUrl: '',
      session: academicSession,
      files: null,
      videoSource: null,
      textContent: '',
      topic: '',
      metadata: {
        upid: userProfile?.upid || '',
        uuid: userProfile?.uuid || '',
        regNumber: userProfile?.regNumber || '',
        isVerified: userProfile?.isVerified?.toString() || 'false',
        phone: userProfile?.phone || '',
        gender: userProfile?.gender || '',
        dob: userProfile?.dob ? userProfile.dob.toISOString() : '',
      }
    });
    setEditingMaterial(null);
  };

  // Handle material submission
  const handleSubmitMaterial = async (): Promise<boolean> => {
    try {
      // Validate required fields
      if (!materialInfo.title || !materialInfo.category || !materialInfo.subcategory || !materialInfo.course) {
        throw new Error('Please fill in all required fields');
      }

      // Validate content based on type
      if (editorType === 'file' && (!materialInfo.files || materialInfo.files.length === 0)) {
        throw new Error('Please select at least one file');
      }

      if (editorType === 'text' && (!materialInfo.textContent || materialInfo.textContent.trim() === '')) {
        throw new Error('Please provide text content');
      }

      if (editorType === 'video' && !materialInfo.videoSource) {
        throw new Error('Please provide video content');
      }

      // Create FormData object
      const formData = new FormData();
      
      // Add material info
      formData.append('title', materialInfo.title);
      formData.append('description', materialInfo.description);
      formData.append('university', materialInfo.school);
      formData.append('faculty', materialInfo.faculty);
      formData.append('department', materialInfo.department);
      formData.append('level', materialInfo.level);
      formData.append('course', materialInfo.course);
      formData.append('semester', materialInfo.semester);
      formData.append('session', materialInfo.session);
      formData.append('category', materialInfo.category!);
      formData.append('subcategory', materialInfo.subcategory!);
      formData.append('topic', materialInfo.topic);
      formData.append('visibility', materialInfo.visibility);
      formData.append('authorName', materialInfo.authorName);
      formData.append('authorEmail', materialInfo.authorEmail);
      formData.append('authorRole', materialInfo.authorRole);
      
      // Add tags
      if (materialInfo.tags && materialInfo.tags.length > 0) {
        formData.append('tags', JSON.stringify(materialInfo.tags));
      }
      
      // Add metadata
      if (materialInfo.metadata) {
        formData.append('metadata', JSON.stringify(materialInfo.metadata));
      }
      
      // Add content based on type
      if (editorType === 'file' && materialInfo.files) {
        materialInfo.files.forEach((file) => {
          formData.append('files', file);
        });
      }
      
      if (editorType === 'text' && materialInfo.textContent) {
        formData.append('textContent', materialInfo.textContent);
      }
      
      if (editorType === 'video' && materialInfo.videoSource) {
        if (materialInfo.videoSource.type === 'file' && materialInfo.videoSource.data instanceof File) {
          formData.append('videoFile', materialInfo.videoSource.data);
        } else if (materialInfo.videoSource.type === 'url' && typeof materialInfo.videoSource.data === 'string') {
          formData.append('videoUrl', materialInfo.videoSource.data);
        }
        formData.append('videoMetadata', JSON.stringify(materialInfo.videoSource.metadata));
      }

      // Submit the material
      await uploadMaterial(formData);
      
      // Reset form and close editor
      resetFormState();
      setShowCreateEditor(false);
      
      // Refresh the materials list
      await fetchMaterials();
      
      return true;
    } catch (error) {
      console.error('Error submitting material:', error);
      throw error;
    }
  };

  // Handle creating new material
  const handleCreateNewMaterial = (type: MaterialEditorType) => {
    setEditorType(type);
    resetFormState();
    setShowCreateEditor(true);
  };

  // Handle editing existing material
  const handleEditMaterial = (material: MaterialItem) => {
    setEditingMaterial(material);
    // Convert material data to MaterialInfo format
    setMaterialInfo({
      title: material.materialTitle || '',
      description: material.materialDescription || '',
      category: material.category || null,
      subcategory: material.subcategory || null,
      tags: material.tags || [],
      visibility: material.isPublic ? 'public' : 'private',
      authorName: material.uploaderName || '',
      authorEmail: material.authorEmail || '',
      authorRole: material.authorRole || 'student',
      school: material.schoolName || '',
      faculty: material.facultyName || '',
      department: material.departmentName || '',
      level: material.level || '',
      semester: material.semester || '',
      course: material.courseName || '',
      session: material.session || '',
      uploadedFileUrl: material.fileUrl || '',
      files: null,
      videoSource: null,
      textContent: material.textContent || '',
      topic: material.topic || '',
      metadata: material.metadata || {}
    });
    
    // Determine editor type based on material type
    if (material.materialType === 'PDF' || material.materialType === 'IMAGE') {
      setEditorType('file');
    } else if (material.materialType === 'VIDEO') {
      setEditorType('video');
    } else {
      setEditorType('text');
    }
    
    setShowCreateEditor(true);
  };

  // Handle closing editor
  const handleCloseEditor = () => {
    setShowCreateEditor(false);
    resetFormState();
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
      
      {/* Debug info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p className="text-blue-700">
          Debug: Initialized: {isInitialized ? 'Yes' : 'No'} | Materials: {materials.length} | Filtered: {filteredMaterials.length}
          {userProfile && ` | User: ${userProfile.fullName}`}
        </p>
      </div>
      
      {/* Search bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by material title, course, or uploader..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Action buttons */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => fetchMaterials()}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
        
        {/* Create new material dropdown */}
        <div className="relative group">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center space-x-2">
            <span>+ New Material</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            <button
              onClick={() => handleCreateNewMaterial('file')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg"
            >
              📄 File Material
            </button>
            <button
              onClick={() => handleCreateNewMaterial('text')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50"
            >
              📝 Text Material
            </button>
            <button
              onClick={() => handleCreateNewMaterial('video')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg"
            >
              🎥 Video Material
            </button>
          </div>
        </div>
      </div>
      
      {/* Pagination info */}
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

      {/* Material Editor Modal */}
      {showCreateEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl max-h-full overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMaterial ? 'Edit Material' : `Create New ${editorType.charAt(0).toUpperCase() + editorType.slice(1)} Material`}
                </h2>
                <button
                  onClick={handleCloseEditor}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Material Editor */}
              <div className="p-6">
                <MaterialEditor
                  mode={editingMaterial ? 'edit' : 'edit'}
                  type={editorType}
                  materialInfo={materialInfo}
                  userProfile={userProfile}
                  onChange={handleMaterialInfoChange}
                  onMetadataChange={handleMetadataChange}
                  onSelectMaterial={handleMaterialSelection}
                  onFilesSelected={handleFilesSelected}
                  onVideoSelected={handleVideoSelected}
                  onTopicChange={handleTopicChange}
                  onContentChange={handleContentChange}
                  acceptedTypes={editorType === 'file' ? '.pdf,.jpg,.jpeg,.png' : undefined}
                  maxFileSizeMB={50}
                  subcategory={materialInfo.subcategory}
                  initialTopic={materialInfo.topic}
                  initialContent={materialInfo.textContent}
                  fileType={editorType === 'file' ? 'pdf' : undefined}
                  autoPopulateUserData={true}
                  onSubmit={handleSubmitMaterial}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials list */}
      <div>
        {currentItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg mb-2">
              {searchTerm ? 'No materials found matching your search' : 'No materials found'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Try a different search term or clear your search to see all materials.' : 'Create your first material using the button above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentItems.map(material => (
              <div key={material.muid} className="p-6 border rounded-lg bg-white shadow hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{material.materialTitle}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        material.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        material.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        material.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {material.status || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Course:</span> {material.courseName}
                      </div>
                      <div>
                        <span className="font-medium">Uploader:</span> {material.uploaderName}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {material.materialType}
                      </div>
                      <div>
                        <span className="font-medium">Department:</span> {material.departmentName}
                      </div>
                    </div>
                    
                    {material.materialDescription && (
                      <p className="text-sm text-gray-700 mb-3">{material.materialDescription}</p>
                    )}
                    
                    <div className="text-xs text-gray-400">
                      Created: {new Date(material.createdAt).toLocaleDateString()}
                      {material.updatedAt && material.updatedAt !== material.createdAt && (
                        <span> • Updated: {new Date(material.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleEditMaterial(material)}
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMaterial(material.muid)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Loading overlay */}
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