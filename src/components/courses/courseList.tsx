// /components/courses/courseList.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CourseEditor from './courseEditor';
import { useCourse } from '@/context/courseContext';

export default function CourseList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateEditor, setShowCreateEditor] = useState(false); // Fix: Added missing state
  const itemsPerPage = 10;

  const {
    courses,
    isLoading,
    error,
    fetchCourses,
    isInitialized,
    clearError,
    updateCourse,
    uploadCourse,
    deleteCourse,
    // pagination
  } = useCourse();

  useEffect(() => {
    if (!isInitialized) {
      fetchCourses();
    }
  }, [isInitialized, fetchCourses]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showCreateEditor) {
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore background scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateEditor]);

  // Filter courses by search term
  const filteredCourses = useMemo(() => {
    if (!searchTerm) return courses;
    return courses.filter(course =>
      course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  const pageCount = Math.ceil(filteredCourses.length / itemsPerPage);
  const currentItems = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Error auto-clear
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

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
          Debug: Initialized: {isInitialized ? 'Yes' : 'No'} | Courses: {courses.length} | Filtered: {filteredCourses.length}
        </p>
      </div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by course name, code, department, faculty, or school..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => fetchCourses()}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
        <button
          onClick={() => setShowCreateEditor(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          + New Course
        </button>
      </div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          Showing {currentItems.length} of {filteredCourses.length} courses
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
      {/* New Course Editor Modal */}
      {showCreateEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Scrollable container */}
          <div className="w-full max-w-4xl max-h-full overflow-y-auto">
            {/* Modal content */}
            <div className="bg-white rounded-lg shadow-xl my-8">
              {/* Header with close button */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
                <h2 className="text-xl font-bold text-gray-900">Create New Course</h2>
                <button
                  onClick={() => setShowCreateEditor(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Course Editor Content */}
              <div className="p-6">
                <CourseEditor
                  initialData={{}}
                  onSave={(data) => { 
                    uploadCourse(data); 
                    setShowCreateEditor(false); 
                  }}
                  isLoading={isLoading}
                  mode="create"
                />
              </div>
              
              {/* Footer with action buttons */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => setShowCreateEditor(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                  disabled={isLoading}
                >
                  Cancel
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
              {searchTerm ? 'No courses found matching your search' : 'No courses found'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Try a different search term or clear your search to see all courses.' : 'No courses available.'}
            </p>
          </div>
        ) : (
          currentItems.map(course => (
            <CourseEditor
              key={course.courseId}
              initialData={course}
              onSave={uploadCourse}
              onUpdate={(id, data) => updateCourse(id, data)}
              onDelete={id => deleteCourse(id)}
              isLoading={isLoading}
              mode="edit"
            />
          ))
        )}
      </div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing course data...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
