'use client';

import { useState } from 'react';
import { MaterialType } from '@/app/upload/page';

type InfoFormProps = {
  materialInfo: {
    university: string;
    faculty: string;
    department: string;
    course: string;
    topic: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectMaterialType: (type: MaterialType) => void;
};

export const InfoForm = ({ materialInfo, onChange, onSelectMaterialType }: InfoFormProps) => {
  const [formComplete, setFormComplete] = useState(false);

  // Check if required fields are filled
  const checkFormCompletion = () => {
    const { university, course, topic } = materialInfo;
    return university.trim() !== '' && course.trim() !== '' && topic.trim() !== '';
  };

  // Watch for changes to update form completion status
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    setTimeout(() => setFormComplete(checkFormCompletion()), 100);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Step 1: Provide Basic Info</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-1">
            University <span className="text-red-500">*</span>
          </label>
          <input 
            id="university"
            name="university" 
            value={materialInfo.university}
            onChange={handleChange} 
            placeholder="e.g., Harvard University" 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300" 
            required
          />
        </div>
        
        <div>
          <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1">
            Faculty
          </label>
          <input 
            id="faculty"
            name="faculty" 
            value={materialInfo.faculty}
            onChange={handleChange} 
            placeholder="e.g., Engineering" 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300" 
          />
        </div>
        
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <input 
            id="department"
            name="department" 
            value={materialInfo.department}
            onChange={handleChange} 
            placeholder="e.g., Computer Science" 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300" 
          />
        </div>
        
        <div>
          <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
            Course <span className="text-red-500">*</span>
          </label>
          <input 
            id="course"
            name="course" 
            value={materialInfo.course}
            onChange={handleChange} 
            placeholder="e.g., Introduction to AI" 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300" 
            required
          />
        </div>
        
        <div className="col-span-2">
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
            Topic <span className="text-red-500">*</span>
          </label>
          <input 
            id="topic"
            name="topic" 
            value={materialInfo.topic}
            onChange={handleChange} 
            placeholder="e.g., Machine Learning Algorithms" 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300" 
            required
          />
        </div>
      </div>

      {/* Material Type Selection */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {formComplete ? 'Now, Select Material Type' : 'Complete the required fields (*) to continue'}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(['PDF', 'PHOTOS', 'VIDEO', 'TEXT'] as MaterialType[]).map((type) => (
            <button
              key={type}
              onClick={() => formComplete && onSelectMaterialType(type)}
              disabled={!formComplete}
              className={`
                px-4 py-3 rounded flex flex-col items-center justify-center h-24
                ${formComplete 
                  ? 'bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
              `}
            >
              <span className="text-xl mb-2">
                {type === 'PDF' && '📄'}
                {type === 'PHOTOS' && '📸'}
                {type === 'VIDEO' && '🎬'}
                {type === 'TEXT' && '📝'}
              </span>
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}