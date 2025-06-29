'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/userContext';
import MaterialList from '@/components/upload/MaterialList';
import { MaterialProvider, useMaterial } from '@/context/materialContext';
import { MaterialInfo } from '@/types/materialUpload';


function MaterialStats() {
  const { materials, isInitialized } = useMaterial();
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div className="bg-white p-3 rounded border">
        <div className="font-medium text-gray-900">Total Materials</div>
        <div className="text-2xl font-bold text-blue-600">{materials.length}</div>
      </div>
      <div className="bg-white p-3 rounded border">
        <div className="font-medium text-gray-900">Features</div>
        <div className="text-xs text-gray-600 mt-1">
          Edit, search, pagination, file & text support
        </div>
      </div>
      <div className="bg-white p-3 rounded border">
        <div className="font-medium text-gray-900">Status</div>
        <div className={isInitialized ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
          {isInitialized ? 'Ready' : 'Loading...'}
        </div>
      </div>
    </div>
  );
}

function UserInfoCard() {
  const { userProfile, getUserDisplayName, getRoleDisplayName } = useUser();
  
  if (!userProfile) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mb-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
          {userProfile.fullName?.charAt(0) || 'U'}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{getUserDisplayName()}</h3>
          <p className="text-sm text-gray-600">{getRoleDisplayName()}</p>
          <p className="text-xs text-gray-500">
            {userProfile.department} • {userProfile.faculty} • {userProfile.school}
          </p>
        </div>
      </div>
    </div>
  );
}

function MaterialDataManagerPage() {
  const router = useRouter();
  const { userProfile, hasActiveSession, userState, isLoading: userLoading } = useUser();
  const [isMobile, setIsMobile] = useState(false);

   // Function to create default material info populated with user data
  const createDefaultMaterialInfo = (): MaterialInfo => {
    if (!userProfile) {
      return {
        title: '',
        description: '',
        category: 'LEARNING_AIDS',
      subcategory: 'LECTURE_NOTE',
        tags: [],
        visibility: 'public',
        authorName: '',
        authorEmail: '',
        authorRole: 'student',
        school: '',
        faculty: '',
        department: '',
        level: '',
        semester: '',
        uploadedFileUrl: '',
        course: '',
        session: '',
        files: null,
        videoSource: null,
        textContent: '',
        topic: '',
        metadata: {}
      };
    }

    // Populate with user data
    return {
      title: '',
      description: '',
      category: 'LEARNING_AIDS',
      subcategory: 'LECTURE_NOTE',
      tags: [],
      visibility: 'public',
      authorName: userProfile.fullName || '',
      authorEmail: userProfile.email || '',
      authorRole: userProfile.role || 'student',
      school: userProfile.school || '',
      faculty: userProfile.faculty || '',
      department: userProfile.department || '',
      level: userProfile.level || '',
      semester: '',
      course: '',
      session: new Date().getFullYear().toString(), // Current year as default session
      files: null,
      uploadedFileUrl: '',
      videoSource: null,
      textContent: '',
      topic: '',
      metadata: {
        upid: userProfile.upid || '',
        uuid: userProfile.uuid || '',
        regNumber: userProfile.regNumber || '',
        isVerified: userProfile.isVerified || false,
        profilePhoto: userProfile.profilePhoto || '',
        phone: userProfile.phone || '',
        gender: userProfile.gender || '',
        dob: userProfile.dob ? userProfile.dob.toISOString() : ''
      }
    };
  };

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Show loading state
  if (userState === 'loading' || userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!hasActiveSession || userState !== 'active_session') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">Please log in to access materials</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show mobile warning
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Desktop Required</h2>
          <p className="text-gray-600 mb-4">
            The Material Data Manager requires a larger screen for optimal experience.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Material Data Manager</h1>
          <p className="text-gray-600">
            Review and manage all educational materials before publishing
          </p>

          {/* User Info Card */}
          <UserInfoCard />

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Tip:</span> Click on any material to edit details. 
              Required fields are marked with a red border.
            </p>
          </div>
          <MaterialStats />
        </header>

        {/* Pass the default material info function to MaterialList */}
        <MaterialList 
          defaultMaterialInfo={createDefaultMaterialInfo()}
          userProfile={userProfile}
        />
      </div>
    </div>
  );
}

export default function MaterialDataManagerPageWithProvider() {
  return (
    <MaterialProvider>
      <MaterialDataManagerPage />
    </MaterialProvider>
  );
}