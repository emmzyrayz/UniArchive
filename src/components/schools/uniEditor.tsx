// /components/schools/UniversityEditor.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { generateUniversityId, generateFacultyId, generateDepartmentId, generateUSID, generatePSID } from '@/utils/generateId';
import { UniversityInput} from '@/models/universitySchema';

export type Ownership = "public" | "private";

interface FormFaculty {
  name: string;
  departments: { name: string }[];
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
  membership: Ownership;
  level?: "federal" | "state";
  usid: string;
  psid: string;
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
}

export default function UniversityEditor({ initialData, onSave }: UniversityEditorProps) {
  const [formData, setFormData] = useState<FormUniversity>(() => {
    const location = [initialData.city, initialData.state].filter(Boolean).join(', ');
    return {
      id: generateUniversityId(initialData.abbreviation),
      name: initialData.name,
      description: '',
      location: location,
      website: initialData.website || '',
      logoUrl: '',
      foundingYear: undefined,
      faculties: [],
      membership: 'public' as Ownership, // Default to public
      level: undefined,
      usid: generateUSID(),
      psid: generatePSID(initialData.name, location),
    };
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

  const handleFacultyChange = (index: number, field: string, value: string) => {
    const updatedFaculties = [...formData.faculties];
    updatedFaculties[index] = { ...updatedFaculties[index], [field]: value };
    setFormData(prev => ({ ...prev, faculties: updatedFaculties }));
  };

  const handleDepartmentChange = (facultyIndex: number, deptIndex: number, value: string) => {
    const updatedFaculties = [...formData.faculties];
    updatedFaculties[facultyIndex].departments[deptIndex] = { name: value };
    setFormData(prev => ({ ...prev, faculties: updatedFaculties }));
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

  const handleSubmit = () => {
    const universityData: UniversityInput = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      location: formData.location,
      website: formData.website,
      logoUrl: formData.logoUrl,
      foundingYear: formData.foundingYear,
      faculties: formData.faculties
        .filter(faculty => faculty.name.trim()) // Only include faculties with names
        .map(faculty => ({
          id: generateFacultyId(formData.id, faculty.name),
          name: faculty.name,
          departments: faculty.departments
            .filter(dept => dept.name.trim()) // Only include departments with names
            .map(dept => ({
              id: generateDepartmentId(generateFacultyId(formData.id, faculty.name), dept.name),
              name: dept.name
            }))
        })),
      membership: formData.membership,
      level: formData.membership === 'public' ? formData.level : undefined,
      usid: formData.usid,
      psid: formData.psid,
    };
    onSave(universityData);
  };

  const isRequiredMissing = !formData.name || !formData.location;

  return (
    <div className="border rounded-lg p-6 mb-6 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{formData.name || 'Unnamed University'}</h3>
        <span className={`px-2 py-1 text-xs rounded ${
          isRequiredMissing ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {isRequiredMissing ? 'Missing Data' : 'Complete'}
        </span>
      </div>

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
            className={`w-full p-2 border rounded ${!formData.website ? 'border-yellow-300' : 'border-gray-300'}`}
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
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <input
            type="url"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.logoUrl}
            onChange={(e) => handleInputChange('logoUrl', e.target.value)}
            placeholder="https://example.edu.ng/logo.png"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Founding Year</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.foundingYear || ''}
            onChange={(e) => handleInputChange('foundingYear', e.target.value ? Number(e.target.value) : undefined)}
            min="1900"
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
          <label className="block text-sm font-medium mb-1">USID</label>
          <div className="p-2 bg-gray-100 rounded text-sm">{formData.usid}</div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">PSID</label>
          <div className="p-2 bg-gray-100 rounded text-sm">{formData.psid}</div>
        </div>
      </div>

      {logoPreview && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Logo Preview</label>
          <Image
            width={300}
            height={500} 
            src={logoPreview} 
            alt="Logo preview" 
            className="max-w-[200px] max-h-[100px] object-contain border p-2 rounded"
            onError={() => setLogoPreview(null)}
          />
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded min-h-[100px]"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="University description..."
        />
      </div>

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
              ID: {generateFacultyId(formData.id, faculty.name) || 'generated when named'}
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
              
              <div className="text-xs text-gray-500 mt-1">
                Department IDs will be generated based on faculty and department names
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isRequiredMissing}
          className={`px-4 py-2 rounded ${
            isRequiredMissing 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          Save University
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