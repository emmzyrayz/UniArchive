'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { MaterialCategory, MaterialSubcategory, MaterialInfo } from '@/types/materialUpload';
import { User } from '@/context/userContext';

export type InfoFormProps = {
  materialInfo: MaterialInfo;
  userProfile?: User | null;
  onChange: (name: string, value: string) => void;
  onMetadataChange: (name: string, value: string) => void;
  onSelectMaterial: (category: MaterialCategory, subcategory: MaterialSubcategory) => void;
  autoPopulateUserData?: boolean;
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
  userProfile,
  onChange,
  onMetadataChange,
  onSelectMaterial,
  autoPopulateUserData = true
}: InfoFormProps) => {
  const [formComplete, setFormComplete] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userDataPopulated, setUserDataPopulated] = useState(false);

  // Auto-populate user data when component mounts or user profile changes
  useEffect(() => {
    if (autoPopulateUserData && userProfile && !userDataPopulated) {
      try {
        console.log('InfoForm: Auto-populating user data');
        
        // Map user profile fields to form fields
        const fieldsToPopulate = [
          { formField: 'uploaderName', userField: userProfile.fullName || '' },
          { formField: 'uploaderRole', userField: userProfile.role || 'student' },
          { formField: 'schoolName', userField: userProfile.school || '' },
          { formField: 'facultyName', userField: userProfile.faculty || '' },
          { formField: 'departmentName', userField: userProfile.department || '' },
          { formField: 'level', userField: userProfile.level || '' },
        ];

        // Only populate empty fields to avoid overwriting existing data
        fieldsToPopulate.forEach(({ formField, userField }) => {
          if (userField && (!materialInfo[formField as keyof typeof materialInfo] || materialInfo[formField as keyof typeof materialInfo] === '')) {
            onChange(formField, userField);
          }
        });

        // Auto-populate metadata
        const metadataToPopulate = [
          { key: 'upid', value: userProfile.upid || '' },
          { key: 'uuid', value: userProfile.uuid || '' },
          { key: 'regNumber', value: userProfile.regNumber || '' },
          { key: 'isVerified', value: userProfile.isVerified?.toString() || 'false' },
          { key: 'phone', value: userProfile.phone || '' },
          { key: 'gender', value: userProfile.gender || '' },
          { key: 'dob', value: userProfile.dob ? userProfile.dob.toISOString() : '' },
        ];

        metadataToPopulate.forEach(({ key, value }) => {
          if (value && (!materialInfo.metadata?.[key] || materialInfo.metadata[key] === '')) {
            onMetadataChange(key, value);
          }
        });

        // Set default session to current academic year if not set
        if (!materialInfo.session || materialInfo.session === '') {
          const currentYear = new Date().getFullYear();
          const academicSession = `${currentYear}/${currentYear + 1}`;
          onChange('session', academicSession);
        }

        setUserDataPopulated(true);
        console.log('InfoForm: User data auto-population completed');
      } catch (err) {
        console.error('InfoForm: Error auto-populating user data:', err);
      }
    }
  }, [userProfile, autoPopulateUserData, userDataPopulated, onChange, onMetadataChange, materialInfo]);

   // Validation function
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'materialTitle':
        if (!value.trim()) return 'Title is required';
        if (value.length < 5) return 'Title must be at least 5 characters';
        return '';
      case 'description':
        if (!value.trim()) return 'Description is required';
        if (value.length < 10) return 'Description must be at least 10 characters';
        return '';
        case 'materialDescription':
  if (value.length > 500) return 'Description must be less than 500 characters';
  return '';
      case 'uploaderName':
        if (!value.trim()) return 'Author name is required';
        return '';
      case 'courseId':
        if (!value.trim()) return 'Course ID is required';
        return '';
      case 'schoolName':
        if (!value.trim()) return 'School is required';
        return '';
      case 'facultyName':
        if (!value.trim()) return 'Faculty is required';
        return '';
      case 'departmentName':
        if (!value.trim()) return 'Department is required';
        return '';
      case 'level':
        if (!value.trim()) return 'Level is required';
        return '';
      case 'course':
        if (!value.trim()) return 'Course is required';
        return '';
      case 'session':
        if (!value.trim()) return 'Session is required';
        return '';
      default:
        return '';
    }
  };

  // Handle input changes with validation
  const handleChange = (name: string, value: string) => {
    onChange(name, value);
    
    // Validate and update errors
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };


   // Memoize the form completion check function
   const checkFormCompletion = useCallback(() => {
    const { schoolName, course, courseId, uploaderName } = materialInfo;
    return schoolName?.trim() !== '' && 
           course?.trim() !== '' && 
           courseId?.trim() !== '' && 
           uploaderName?.trim() !== '';
  }, [materialInfo]);

  // Update form completion status
  useEffect(() => {
    setFormComplete(checkFormCompletion());
  }, [checkFormCompletion]);

  // Handle subcategory selection
  const handleSubcategorySelect = (category: MaterialCategory, subcategory: MaterialSubcategory) => {
    onSelectMaterial(category, subcategory);
  };

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

   // User info display banner
  const renderUserInfoBanner = () => {
    if (!userProfile || !autoPopulateUserData) return null;

    return (
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {userProfile.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">
              Auto-populated with your profile information
            </p>
            <p className="text-xs text-green-600">
              {userProfile.fullName} • {userProfile.department} • {userProfile.level}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* User info banner */}
      {renderUserInfoBanner()}
      
      <h2 className="text-xl font-semibold mb-6">Step 1: Provide Material Information</h2>
      
       {/* Author Information Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-800">Author Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="uploaderName" className="block text-sm font-medium text-gray-700 mb-1">
              Author Name <span className="text-red-500">*</span>
            </label>
            <input 
              id="uploaderName"
              name="uploaderName" 
              value={materialInfo.uploaderName || ''}
              onChange={(e) => handleChange('uploaderName', e.target.value)} 
              placeholder="e.g., John Doe" 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.uploaderName ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.uploaderName && (
              <p className="text-red-500 text-xs mt-1">{errors.uploaderName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Academic Information Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-800">Academic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-1">
              University/School <span className="text-red-500">*</span>
            </label>
            <input 
              id="schoolName"
              name="schoolName" 
              value={materialInfo.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)} 
              placeholder="e.g., Harvard University" 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.schoolName ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.schoolName && (
              <p className="text-red-500 text-xs mt-1">{errors.schoolName}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1">
              Faculty <span className="text-red-500">*</span>
            </label>
            <input 
              id="faculty"
              name="faculty" 
              value={materialInfo.facultyName}
              onChange={(e) => handleChange('faculty', e.target.value)} 
              placeholder="e.g., Engineering" 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.faculty ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.faculty && (
              <p className="text-red-500 text-xs mt-1">{errors.faculty}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="departmentName" className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <input 
              id="department"
              name="department" 
              value={materialInfo.departmentName}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="e.g., Computer Science" 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.department ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.department && (
              <p className="text-red-500 text-xs mt-1">{errors.department}</p>
            )}
          </div>

          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
              Level <span className="text-red-500">*</span>
            </label>
            <input 
              id="level"
              name="level" 
              value={materialInfo.level}
              onChange={(e) => handleChange('level', e.target.value)}
              placeholder="e.g., 100, 200, 300..." 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.level ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.level && (
              <p className="text-red-500 text-xs mt-1">{errors.level}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
              Course <span className="text-red-500">*</span>
            </label>
            <input 
              id="course"
              name="course" 
              value={materialInfo.course}
              onChange={(e) => handleChange('course', e.target.value)}
              placeholder="e.g., Introduction to AI" 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.course ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.course && (
              <p className="text-red-500 text-xs mt-1">{errors.course}</p>
            )}
          </div>

           {/* Course ID */}
          <div>
            <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">
              Course ID <span className="text-red-500">*</span>
            </label>
            <input 
              id="courseId"
              name="courseId" 
              value={materialInfo.courseId || ''}
              onChange={(e) => handleChange('courseId', e.target.value)}
              placeholder="e.g., CSC101" 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.courseId ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.courseId && (
              <p className="text-red-500 text-xs mt-1">{errors.courseId}</p>
            )}
          </div>

          <div>
            <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-1">
              Academic Session <span className="text-red-500">*</span>
            </label>
            <input 
              id="session"
              name="session" 
              value={materialInfo.session || ''}
              onChange={(e) => handleChange('session', e.target.value)}
              placeholder="e.g., 2024/2025" 
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                errors.session ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.session && (
              <p className="text-red-500 text-xs mt-1">{errors.session}</p>
            )}
          </div>
        </div>
      </div>

      {/* Example usage of metadata change */}
      <div className="mb-6">
        <label htmlFor="materialDescription" className="block text-sm font-medium text-gray-700 mb-1">
          Material Description
        </label>
        <textarea 
          id="materialDescription"
          name="materialDescription" 
          value={materialInfo.materialDescription || ''}
          placeholder="Any additional details about the material" 
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300" 
          rows={3}
          onChange={(e) => handleChange('materialDescription', e.target.value)}
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
                  onClick={() => handleSubcategorySelect(selectedCategory, subcategory.id)}
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