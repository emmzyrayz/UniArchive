// /components/schools/UniversityEditor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { generateUniversityId, generateFacultyId, generateDepartmentId, generateUSID, generatePSID } from '@/utils/generateId';
import { UniversityInput } from '@/models/universitySchema';
import { useAdmin } from '@/context/adminContext';

export type Ownership = "public" | "private";

interface FormFaculty {
  id?: string;
  name: string;
  departments: { id?: string; name: string }[];
}

interface FormCampus {
  id?: string;
  name: string;
  location: string;
  type: 'main' | 'branch' | 'satellite';
}

interface FormUniversity {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string;
  logoUrl: string;
  foundingYear?: number;
  faculties: FormFaculty[];
  campuses: FormCampus[];
  membership: Ownership;
  level?: "federal" | "state";
  usid: string;
  psid: string;
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
}

interface UniversityEditorProps {
  initialData: {
    name: string;
    state: string;
    city: string;
    abbreviation: string;
    website: string;
  };
  onSave: (data: UniversityInput) => void;
  onUpdate?: (data: UniversityInput) => void;
  isLoading?: boolean;
  isSaved?: boolean;
  existingUniversity?: UniversityInput | null;
  mode?: 'create' | 'edit';
}

export default function UniversityEditor({
   initialData, 
   onSave,
   onUpdate,
   isLoading = false,  
   isSaved = false,
   existingUniversity = null,
   mode = 'create'
  }: UniversityEditorProps) {
  const { uploadImage, isLoading: contextLoading, uploadProgress, error: contextError,
  clearError  } = useAdmin();

   // Helper function to convert UniversityInput to FormUniversity - MOVED BEFORE useState
  const convertToFormUniversity = (uni: UniversityInput): FormUniversity => {
    return {
      id: uni.id,
      name: uni.name,
      description: uni.description,
      location: uni.location,
      website: uni.website,
      logoUrl: uni.logoUrl,
      foundingYear: uni.foundingYear,
      faculties: uni.faculties?.map(faculty => ({
        id: faculty.id,
        name: faculty.name,
        departments: faculty.departments?.map(dept => ({
          id: dept.id,
          name: dept.name
        })) || [{ name: '' }]
      })) || [],
      campuses: uni.campuses?.map(campus => ({
        id: campus.id,
        name: campus.name,
        location: campus.location,
        type: campus.type
      })) || [{
        name: `${uni.name} Main Campus`,
        location: uni.location,
        type: 'main'
      }],
      membership: uni.membership,
      level: uni.level,
      usid: uni.usid,
      psid: uni.psid,
      motto: uni.motto || '',
      chancellor: uni.chancellor || '',
      viceChancellor: uni.viceChancellor || '',
    };
  };
  
  const [formData, setFormData] = useState<FormUniversity>(() => {
    const location = [initialData.city, initialData.state].filter(Boolean).join(', ');
    const universityId = generateUniversityId(initialData.abbreviation);

    if (existingUniversity && mode === 'edit') {
      return convertToFormUniversity(existingUniversity);
    }
    
    
    // Default new university form
    return {
      id: universityId,
      name: initialData.name,
      description: '',
      location: location,
      website: initialData.website || '',
      logoUrl: '',
      foundingYear: undefined,
      faculties: [],
      campuses: [{
        name: `${initialData.name} Main Campus`,
        location: location,
        type: 'main'
      }],
      membership: 'public' as Ownership,
      level: undefined,
      usid: generateUSID(),
      psid: generatePSID(initialData.name, location),
      motto: '',
      chancellor: '',
      viceChancellor: '',
    };
  });

   // Reset form when existingUniversity changes
  useEffect(() => {
    if (mode === 'edit' && existingUniversity) {
      setFormData(convertToFormUniversity(existingUniversity));
      if (existingUniversity.logoUrl) {
        setLogoPreview(existingUniversity.logoUrl);
      }
    }
  }, [existingUniversity, mode]);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Set logo preview on mount if editing existing university
  useEffect(() => {
    if (mode === 'edit' && existingUniversity?.logoUrl) {
      setLogoPreview(existingUniversity.logoUrl);
    }
  }, [mode, existingUniversity]);

  // Track form modifications for edit mode
  useEffect(() => {
    if (mode === 'edit' && existingUniversity) {
      // Compare current form data with original data to detect changes
      const hasChanges = JSON.stringify(formData) !== JSON.stringify({
        id: existingUniversity.id,
        name: existingUniversity.name,
        description: existingUniversity.description,
        location: existingUniversity.location,
        website: existingUniversity.website,
        logoUrl: existingUniversity.logoUrl,
        foundingYear: existingUniversity.foundingYear,
        faculties: existingUniversity.faculties?.map(faculty => ({
          id: faculty.id,
          name: faculty.name,
          departments: faculty.departments?.map(dept => ({
            id: dept.id,
            name: dept.name
          })) || []
        })) || [],
        campuses: existingUniversity.campuses?.map(campus => ({
          id: campus.id,
          name: campus.name,
          location: campus.location,
          type: campus.type
        })) || [],
        membership: existingUniversity.membership,
        level: existingUniversity.level,
        usid: existingUniversity.usid,
        psid: existingUniversity.psid,
        motto: existingUniversity.motto || '',
        chancellor: existingUniversity.chancellor || '',
        viceChancellor: existingUniversity.viceChancellor || '',
      });
      setIsModified(hasChanges);
    }
  }, [formData, mode, existingUniversity]);

  const handleInputChange = (field: keyof FormUniversity, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'logoUrl' && typeof value === 'string' && value) {
      try {
        new URL(value);
        setLogoPreview(value);
      } catch {
        setLogoPreview(null);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size too large. Maximum size is 5MB');
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async () => {
    if (!logoFile) return;

    setUploading(true);
    try {
      const imageUrl = await uploadImage(logoFile);
      if (imageUrl) {
        setFormData(prev => ({ ...prev, logoUrl: imageUrl }));
        setLogoPreview(imageUrl);
        setLogoFile(null);
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleFacultyChange = (index: number, field: string, value: string) => {
    const updatedFaculties = [...formData.faculties];
    updatedFaculties[index] = { ...updatedFaculties[index], [field]: value };
    setFormData(prev => ({ ...prev, faculties: updatedFaculties }));
  };

  const handleDepartmentChange = (facultyIndex: number, deptIndex: number, value: string) => {
    const updatedFaculties = [...formData.faculties];
    updatedFaculties[facultyIndex].departments[deptIndex] = { 
      ...updatedFaculties[facultyIndex].departments[deptIndex],
      name: value 
    };
    setFormData(prev => ({ ...prev, faculties: updatedFaculties }));
  };

  const handleCampusChange = (index: number, field: keyof FormCampus, value: string) => {
    const updatedCampuses = [...formData.campuses];
    updatedCampuses[index] = { ...updatedCampuses[index], [field]: value };
    setFormData(prev => ({ ...prev, campuses: updatedCampuses }));
  };

  const addFaculty = () => {
    setFormData(prev => ({
      ...prev,
      faculties: [...prev.faculties, { name: '', departments: [{ name: '' }] }]
    }));
  };

  const removeFaculty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faculties: prev.faculties.filter((_, i) => i !== index)
    }));
  };

  const addDepartment = (facultyIndex: number) => {
    const updatedFaculties = [...formData.faculties];
    updatedFaculties[facultyIndex].departments.push({ name: '' });
    setFormData(prev => ({ ...prev, faculties: updatedFaculties }));
  };

  const removeDepartment = (facultyIndex: number, deptIndex: number) => {
    const updatedFaculties = [...formData.faculties];
    updatedFaculties[facultyIndex].departments = updatedFaculties[facultyIndex].departments.filter((_, i) => i !== deptIndex);
    setFormData(prev => ({ ...prev, faculties: updatedFaculties }));
  };

  const addCampus = () => {
    setFormData(prev => ({
      ...prev,
      campuses: [...prev.campuses, { name: '', location: '', type: 'branch' }]
    }));
  };

  const removeCampus = (index: number) => {
    if (formData.campuses.length <= 1) {
      alert('At least one campus is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      campuses: prev.campuses.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    console.log('Form data before processing:', JSON.stringify(formData, null, 2));
    
    // Process campuses
    const processedCampuses = formData.campuses
      .map((campus, index) => {
        const campusName = campus.name.trim() || `${formData.name} ${campus.type === 'main' ? 'Main' : 'Branch'} Campus`;
        const campusLocation = campus.location.trim() || formData.location;
        
        return {
          id: campus.id || `${formData.id}_campus_${index + 1}`,
          name: campusName,
          location: campusLocation,
          type: campus.type
        };
      });

    // Ensure at least one campus exists
    if (processedCampuses.length === 0) {
      processedCampuses.push({
        id: `${formData.id}_campus_1`,
        name: `${formData.name} Main Campus`,
        location: formData.location,
        type: 'main' as const
      });
    }

    const universityData: UniversityInput = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      location: formData.location,
      website: formData.website,
      logoUrl: formData.logoUrl,
      foundingYear: formData.foundingYear,
      faculties: formData.faculties
        .filter(faculty => faculty.name.trim())
        .map(faculty => ({
          id: faculty.id || generateFacultyId(formData.id, faculty.name),
          name: faculty.name,
          departments: faculty.departments
            .filter(dept => dept.name.trim())
            .map(dept => ({
              id: dept.id || generateDepartmentId(faculty.id || generateFacultyId(formData.id, faculty.name), dept.name),
              name: dept.name
            }))
        })),
      campuses: processedCampuses,
      // status: formData.status,
      membership: formData.membership,
      level: formData.membership === 'public' ? formData.level : undefined,
      usid: formData.usid,
      psid: formData.psid,
      motto: formData.motto || undefined,
      chancellor: formData.chancellor || undefined,
      viceChancellor: formData.viceChancellor || undefined,
    };

    console.log('Final university data:', JSON.stringify(universityData, null, 2));
    
    if (mode === 'edit' && onUpdate) {
      onUpdate(universityData);
    } else {
      onSave(universityData);
    }
  };

  const isRequiredMissing = !formData.name || !formData.location || !formData.logoUrl;
  const currentlyLoading = isLoading || contextLoading;

  return (
    <div className="border rounded-lg p-6 mb-6 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{formData.name || 'Unnamed University'}</h3>
          {mode === 'edit' && (
            <p className="text-sm text-gray-500">Editing existing university</p>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-1 text-xs rounded ${
            isSaved ? 'bg-green-100 text-green-800' : 
            isRequiredMissing ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {isSaved ? 'Saved' : isRequiredMissing ? 'Missing Data' : 'Complete'}
          </span>
          {mode === 'edit' && isModified && (
            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
              Modified
            </span>
          )}
        </div>
      </div>

      {contextError && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
    {contextError}
    <button onClick={clearError} className="ml-2 text-red-500">×</button>
  </div>
)}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">University ID</label>
          <div className="p-2 bg-gray-100 rounded text-sm">{formData.id}</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">University Name*</label>
          <input
            type="text"
            className={`w-full p-2 border rounded ${!formData.name ? 'border-red-300' : 'border-gray-300'}`}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <input
            type="url"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://example.edu.ng"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location*</label>
          <input
            type="text"
            className={`w-full p-2 border rounded ${!formData.location ? 'border-red-300' : 'border-gray-300'}`}
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Founding Year</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.foundingYear || ''}
            onChange={(e) => handleInputChange('foundingYear', e.target.value ? Number(e.target.value) : undefined)}
            min="1800"
            max={new Date().getFullYear()}
            placeholder="1960"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ownership*</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.membership}
            onChange={(e) => handleInputChange('membership', e.target.value as Ownership)}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Level (Public Only)</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.level || ''}
            onChange={(e) => 
              handleInputChange('level', 
                e.target.value as "federal" | "state" | undefined)
            }
            disabled={formData.membership === 'private'}
          >
            <option value="">Select level</option>
            <option value="federal">Federal</option>
            <option value="state">State</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Motto</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.motto}
            onChange={(e) => handleInputChange('motto', e.target.value)}
            placeholder="University motto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Chancellor</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.chancellor}
            onChange={(e) => handleInputChange('chancellor', e.target.value)}
            placeholder="Chancellor name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Vice Chancellor</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.viceChancellor}
            onChange={(e) => handleInputChange('viceChancellor', e.target.value)}
            placeholder="Vice Chancellor name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">USID</label>
          <div className="p-2 bg-gray-100 rounded text-sm">{formData.usid}</div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">PSID</label>
          <div className="p-2 bg-gray-100 rounded text-sm">{formData.psid}</div>
        </div>
      </div>

      {/* Logo Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">University Logo*</label>
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: JPEG, PNG, WebP, GIF. Max size: 5MB
            </p>
          </div>
          
          {logoFile && (
            <button
              type="button"
              onClick={uploadLogo}
              disabled={uploading || currentlyLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
            >
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </button>
          )}
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-2">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">{uploadProgress}% uploaded</p>
          </div>
        )}

        {logoPreview && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Logo Preview</label>
            <Image
              width={200}
              height={100} 
              src={logoPreview} 
              alt="Logo preview" 
              className="max-w-[200px] max-h-[100px] object-contain border p-2 rounded"
              onError={() => setLogoPreview(null)}
            />
            {formData.logoUrl && (
              <p className="text-xs text-green-600 mt-1">✓ Logo uploaded successfully</p>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded min-h-[100px]"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="University description..."
        />
      </div>

      {/* Campuses Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium">Campuses (Current: {formData.campuses.length})</h4>
          <button 
            type="button" 
            onClick={addCampus}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            + Add Campus
          </button>
        </div>

        {formData.campuses.map((campus, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                <div>
                  <label className="block text-sm font-medium mb-1">Campus Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={campus.name}
                    onChange={(e) => handleCampusChange(index, 'name', e.target.value)}
                    placeholder={`${formData.name} ${campus.type === 'main' ? 'Main' : 'Branch'} Campus`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Campus Location</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={campus.location}
                    onChange={(e) => handleCampusChange(index, 'location', e.target.value)}
                    placeholder={formData.location || "City, State"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Campus Type</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded"
                    value={campus.type}
                    onChange={(e) => handleCampusChange(index, 'type', e.target.value as 'main' | 'branch' | 'satellite')}
                  >
                    <option value="main">Main</option>
                    <option value="branch">Branch</option>
                    <option value="satellite">Satellite</option>
                  </select>
                </div>
              </div>
              {formData.campuses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCampus(index)}
                  className="ml-2 text-red-600 hover:text-red-800 text-sm mt-6"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Preview: {campus.name || `${formData.name} ${campus.type === 'main' ? 'Main' : 'Branch'} Campus`} - {campus.location || formData.location}
            </div>
          </div>
        ))}
      </div>

      {/* Faculties Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium">Faculties & Departments</h4>
          <button 
            type="button" 
            onClick={addFaculty}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            + Add Faculty
          </button>
        </div>

        {formData.faculties.map((faculty, facultyIndex) => (
          <div key={facultyIndex} className="border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Faculty Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={faculty.name}
                  onChange={(e) => handleFacultyChange(facultyIndex, 'name', e.target.value)}
                  placeholder="Faculty of Engineering"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFaculty(facultyIndex)}
                className="ml-2 text-red-600 hover:text-red-800 text-sm mt-6"
              >
                Remove
              </button>
            </div>
            
            <div className="text-xs text-gray-500 mb-3">
              ID: {faculty.id || generateFacultyId(formData.id, faculty.name) || 'generated when named'}
            </div>

            <div className="ml-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Departments</label>
                <button 
                  type="button" 
                  onClick={() => addDepartment(facultyIndex)}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                >
                  + Add Department
                </button>
              </div>

              {faculty.departments.map((dept, deptIndex) => (
                <div key={deptIndex} className="flex items-center mb-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded"
                    value={dept.name}
                    onChange={(e) => handleDepartmentChange(facultyIndex, deptIndex, e.target.value)}
                    placeholder="Department name"
                  />
                  <button
                    type="button"
                    onClick={() => removeDepartment(facultyIndex, deptIndex)}
                    className="ml-2 text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isRequiredMissing || currentlyLoading || (isSaved && !isModified)}
          className={`px-4 py-2 rounded ${
            isRequiredMissing || currentlyLoading || (isSaved && !isModified)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {mode === 'edit' ? (
            isModified ? (currentlyLoading ? 'Updating...' : 'Update University') : 'No Changes'
          ) : (
            isSaved ? 'Saved' : currentlyLoading ? 'Saving...' : 'Save University'
          )}
        </button>
        
        <button
          type="button"
          onClick={() => console.log('Current form data:', formData)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Debug Data
        </button>
      </div>
    </div>
  );
}