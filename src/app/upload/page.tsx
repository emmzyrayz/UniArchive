'use client';

import { useState } from 'react';

type MaterialType = 'PDF' | 'PHOTOS' | 'VIDEO' | 'TEXT';

export default function UploadPage() {
  const [materialType, setMaterialType] = useState<MaterialType | null>(null);
  const [survey, setSurvey] = useState({ university: '', course: '', topic: '' });

  const handleSurveyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSurvey({ ...survey, [name]: value });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Step 1: Provide Basic Info</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input name="university" onChange={handleSurveyChange} placeholder="University" className="input" />
        <input name="faculty" onChange={handleSurveyChange} placeholder="Faculty" className="input" />
        <input name="department" onChange={handleSurveyChange} placeholder="Department" className="input" />
        <input name="course" onChange={handleSurveyChange} placeholder="Course" className="input" />
        <input name="topic" onChange={handleSurveyChange} placeholder="Topic" className="input col-span-2" />
      </div>

      <h2 className="text-lg font-semibold mb-4">Step 2: Select Material Type</h2>
      <div className="flex gap-4 mb-6">
        {(['PDF', 'PHOTOS', 'VIDEO', 'TEXT'] as MaterialType[]).map((type) => (
          <button
            key={type}
            onClick={() => setMaterialType(type)}
            className={`px-4 py-2 rounded ${materialType === type ? 'bg-black text-white' : 'bg-gray-200'}`}
          >
            {type}
          </button>
        ))}
      </div>

      {materialType === 'PDF' && <input type="file" accept="application/pdf" className="block" />}
      {materialType === 'PHOTOS' && <input type="file" accept="image/*" multiple className="block" />}
      {materialType === 'VIDEO' && <input type="file" accept="video/*" className="block" />}
      {materialType === 'TEXT' && <textarea className="w-full h-40 p-2 border border-gray-300 rounded" placeholder="Type the content here..." />}

      <div className="mt-6 text-right">
        <a href="/upload/preview" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Continue to Preview
        </a>
      </div>
    </div>
  );
}
