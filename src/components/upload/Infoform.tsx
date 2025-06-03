'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { MaterialCategory, MaterialSubcategory } from '@/app/upload/page';

type InfoFormProps = {
  materialInfo: {
    university: string;
    faculty: string;
    department: string;
    course: string;
    topic: string;
    metadata?: Record<string, string>;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMetadataChange: (name: string, value: string) => void;
  onSelectMaterial: (category: MaterialCategory, subcategory: MaterialSubcategory) => void;
};

const CATEGORIES = [
  {
    id: 'LEARNING_AIDS' as MaterialCategory,
    label: '📚 Learning Aids',
    description: 'Educational materials to help with learning and understanding concepts',
    subcategories: [
      { 
        id: 'LECTURE_NOTE' as MaterialSubcategory, 
        label: 'Lecture Notes',
        description: 'Notes from classes, sometimes handwritten or typed. Examples: PDF, text files, scanned pages'
      },
      { 
        id: 'COURSE_MATERIAL' as MaterialSubcategory, 
        label: 'Course Materials',
        description: 'Textbooks, curriculum outlines, syllabi, handouts. Example: CSC201 full module'
      },
      { 
        id: 'TUTORIAL' as MaterialSubcategory, 
        label: 'Tutorial / Summary Sheet',
        description: 'Condensed versions of topics, cheat sheets, diagrams. Examples: PDF cheat sheets'
      },
      { 
        id: 'SYLLABUS' as MaterialSubcategory, 
        label: 'Course Overview / Syllabus',
        description: 'Outline of course objectives, topics, grading system. Example: Semester plan'
      },
    ]
  },
  {
    id: 'ACADEMIC_WORK' as MaterialCategory,
    label: '🧪 Academic Work',
    description: 'Student assignments, projects, and academic submissions',
    subcategories: [
      { 
        id: 'ASSIGNMENT' as MaterialSubcategory, 
        label: 'Assignment / Solution Guide',
        description: 'Marked assignments or answer keys for practice. Examples: Problem sets + answers'
      },
      { 
        id: 'PROJECT' as MaterialSubcategory, 
        label: 'Project / Research Work',
        description: 'Final year projects, seminar papers, research papers. Examples: DOC/PDF, sometimes zipped'
      },
      { 
        id: 'LAB_REPORT' as MaterialSubcategory, 
        label: 'Lab Report / Experiment',
        description: 'Practical lab work, experiment results. Examples: Biology, Chemistry, Physics lab docs'
      },
    ]
  },
  {
    id: 'MEDIA' as MaterialCategory,
    label: '🎥 Media',
    description: 'Video and multimedia educational content',
    subcategories: [
      { 
        id: 'RECORDED_LECTURE' as MaterialSubcategory, 
        label: 'Recorded Lecture',
        description: 'Video/audio recordings of classes or tutorials. Examples: Video file or YouTube embed'
      },
      { 
        id: 'PRESENTATION' as MaterialSubcategory, 
        label: 'Presentation Slides',
        description: 'PowerPoint or PDF slides used by lecturers or students. Examples: .pptx, .pdf'
      },
    ]
  },
  {
    id: 'EXAMS' as MaterialCategory,
    label: '📝 Exams',
    description: 'Test materials and examination resources',
    subcategories: [
      { 
        id: 'PAST_QUESTION' as MaterialSubcategory, 
        label: 'Past Question',
        description: 'Previous exam/test questions for revision. Examples: WAEC, departmental exams'
      },
      { 
        id: 'MOCK_EXAM' as MaterialSubcategory, 
        label: 'Mock Exam / Practice Test',
        description: 'Practice questions or third-party test simulations. Examples: Test drills'
      },
    ]
  },
  {
    id: 'BOOKS' as MaterialCategory,
    label: '📖 Books',
    description: 'Textbooks and reference materials',
    subcategories: [
      { 
        id: 'TEXTBOOK' as MaterialSubcategory, 
        label: 'E-book / Textbook',
        description: 'Complete scanned textbooks or ebooks shared among peers. Examples: .pdf, .epub'
      },
      { 
        id: 'EBOOK' as MaterialSubcategory, 
        label: 'E-books',
        description: 'Digital books and electronic reading materials in various formats'
      },
    ]
  },
];

export const InfoForm = ({ 
  materialInfo, 
  onChange,
  onMetadataChange,
  onSelectMaterial 
}: InfoFormProps) => {
  const [formComplete, setFormComplete] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<string | null>(null);

  // Memoize the form completion check function
  const checkFormCompletion = useCallback(() => {
    const { university, course, topic } = materialInfo;
    return university.trim() !== '' && course.trim() !== '' && topic.trim() !== '';
  }, [materialInfo]);

  // Update form completion status
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    setTimeout(() => setFormComplete(checkFormCompletion()), 0);
  };

  // Handle metadata changes (example usage)
  const handleMetadataChange = (name: string, value: string) => {
    onMetadataChange(name, value);
  };

  // Check form completion on mount and when materialInfo changes
  useEffect(() => {
    setFormComplete(checkFormCompletion());
  }, [checkFormCompletion]);

  // Get subcategories for selected category
  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    return CATEGORIES.find(c => c.id === selectedCategory)?.subcategories || [];
  }, [selectedCategory]);

  // Get description for category
  const getCategoryDescription = useCallback((categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId)?.description || '';
  }, []);

  // Get description for subcategory
  const getSubcategoryDescription = useCallback((subcategoryId: string) => {
    for (const category of CATEGORIES) {
      const subcategory = category.subcategories.find(s => s.id === subcategoryId);
      if (subcategory) return subcategory.description;
    }
    return '';
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Step 1: Provide Material Information</h2>
      
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

      {/* Example usage of metadata change */}
      <div className="mb-6">
        <label htmlFor="additional-info" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Information
        </label>
        <input 
          id="additional-info"
          name="additional-info" 
          placeholder="Any additional details about the material" 
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300" 
          onChange={(e) => handleMetadataChange('additionalInfo', e.target.value)}
        />
      </div>

      {/* Material Category Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {formComplete ? 'Select Material Category' : 'Complete the required fields (*) to continue'}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {CATEGORIES.map((category) => (
            <div key={category.id} className="relative">
              <button
                onClick={() => {
                  if (formComplete) {
                    setSelectedCategory(category.id);
                  }
                }}
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                disabled={!formComplete}
                className={`
                  w-full px-4 py-4 rounded flex flex-col items-center justify-center relative
                  ${formComplete 
                    ? selectedCategory === category.id
                      ? 'bg-blue-100 border-2 border-blue-500 text-blue-600'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                `}
              >
                <span className="text-xl mb-2">
                  {category.label.split(' ')[0]}
                </span>
                <span className="text-sm text-center">{category.label.substring(2)}</span>
              </button>
              
              {/* Tooltip */}
              {hoveredCategory === category.id && formComplete && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded whitespace-nowrap max-w-64 text-center">
                  {getCategoryDescription(category.id)}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subcategory Selection */}
      {selectedCategory && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Select Material Type
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {subcategories.map((subcategory) => (
              <div key={subcategory.id} className="relative">
                <button
                  onClick={() => onSelectMaterial(selectedCategory, subcategory.id)}
                  onMouseEnter={() => setHoveredSubcategory(subcategory.id)}
                  onMouseLeave={() => setHoveredSubcategory(null)}
                  className="w-full px-4 py-3 rounded bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
                >
                  {subcategory.label}
                </button>
                
                {/* Tooltip */}
                {hoveredSubcategory === subcategory.id && (
                  <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded max-w-64 text-center">
                    {getSubcategoryDescription(subcategory.id)}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}