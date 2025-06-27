// components/upload/MaterialEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { InfoForm } from './Infoform';
import { FileUploader } from './FileUploader';
import { TextUploader } from './TextUploader';
import { VideoUploader } from './VideoUploader';
import { FilePreview } from '@/components/preview/filePreview';
import { TextPreview } from '@/components/preview/TextPreview';
import { VideoPreview } from '@/components/preview/VideoPreview';
import { MaterialCategory, MaterialSubcategory, MaterialInfo, VideoSource } from '@/types/materialUpload';
import { User } from '@/context/userContext';

export type MaterialEditorMode = 'edit' | 'preview';
export type MaterialEditorType = 'file' | 'text' | 'video';


type MaterialEditorProps = {
  mode: MaterialEditorMode;
  type: MaterialEditorType;
  materialInfo: MaterialInfo;
  userProfile?: User | null; // Optional user profile for auto-population

  onChange: (name: string, value: string) => void;
  onMetadataChange?: (name: string, value: string) => void;
  onSelectMaterial: (category: MaterialCategory, subcategory: MaterialSubcategory) => void;
  onFilesSelected?: (files: File[] | null) => void;
  onVideoSelected?: (videoSource: VideoSource | null) => void;  // Separate handler for video
  onTopicChange?: (topic: string) => void;
  onContentChange?: (content: string) => void;
  acceptedTypes?: string;
  maxFileSizeMB?: number;
  subcategory?: MaterialSubcategory | null;
  initialTopic?: string;
  initialContent?: string;
  fileType?: 'pdf' | 'image'; // For FilePreview
  autoPopulateUserData?: boolean;
};

export const MaterialEditor = (props: MaterialEditorProps) => {
  const {
    mode,
    type,
    materialInfo,
    userProfile,
    onChange,
    onMetadataChange,
    onSelectMaterial,
    onFilesSelected,
    onVideoSelected,
    onTopicChange,
    onContentChange,
    acceptedTypes = '.pdf,.jpg,.jpeg,.png',
    maxFileSizeMB = 50,
    subcategory,
    initialTopic,
    initialContent,
    fileType = 'pdf',
    autoPopulateUserData = true,
  } = props;

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userDataPopulated, setUserDataPopulated] = useState(false);

  // Auto-populate user data when component mounts or user profile changes
  useEffect(() => {
    if (autoPopulateUserData && userProfile && !userDataPopulated && mode === 'edit') {
      try {
        console.log('MaterialEditor: Auto-populating user data');
        
        // Auto-populate user information if not already set
        const fieldsToPopulate = [
          { key: 'authorName', value: userProfile.fullName || '' },
          { key: 'authorEmail', value: userProfile.email || '' },
          { key: 'authorRole', value: userProfile.role || 'student' },
          { key: 'school', value: userProfile.school || '' },
          { key: 'faculty', value: userProfile.faculty || '' },
          { key: 'department', value: userProfile.department || '' },
          { key: 'level', value: userProfile.level || '' },
        ];

        // Only populate empty fields to avoid overwriting existing data
        fieldsToPopulate.forEach(({ key, value }) => {
          if (value && (!materialInfo[key as keyof MaterialInfo] || materialInfo[key as keyof MaterialInfo] === '')) {
            onChange(key, value);
          }
        });

        // Auto-populate metadata if onMetadataChange is available
        if (onMetadataChange) {
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
        }

        // Set default session to current academic year if not set
        if (!materialInfo.session || materialInfo.session === '') {
          const currentYear = new Date().getFullYear();
          const academicSession = `${currentYear}/${currentYear + 1}`;
          onChange('session', academicSession);
        }

        setUserDataPopulated(true);
        console.log('MaterialEditor: User data auto-population completed');
      } catch (err) {
        console.error('MaterialEditor: Error auto-populating user data:', err);
        setError('Failed to auto-populate user data');
      }
    }
  }, [userProfile, autoPopulateUserData, userDataPopulated, mode, onChange, onMetadataChange, materialInfo]);

  // Error handling and validation
  useEffect(() => {
    try {
      // Validate props
      if (!mode || !type) {
        throw new Error('Missing required props: mode and type');
      }

      // Additional validation based on mode and type
      if (mode === 'edit' && type === 'file' && !onFilesSelected) {
        console.warn('onFilesSelected is required for file edit mode');
      }

      if (mode === 'edit' && type === 'video' && !onVideoSelected) {
        console.warn('onVideoSelected is required for video edit mode');
      }

      if (mode === 'preview' && !materialInfo) {
        throw new Error('materialInfo is required for preview mode');
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
      console.error('MaterialEditor initialization error:', err);
    }
  }, [mode, type, materialInfo, onFilesSelected, onVideoSelected]);

  // Error handling wrapper for optional callbacks
  const handleFilesSelected = (files: File[] | null) => {
    if (onFilesSelected) {
      onFilesSelected(files);
    }
  };

  const handleVideoSelected = (videoSource: VideoSource | null) => {
    if (onVideoSelected) {
      onVideoSelected(videoSource);
    }
  };

  const handleTopicChange = (topic: string) => {
    if (onTopicChange) {
      onTopicChange(topic);
    }
  };

  const handleContentChange = (content: string) => {
    if (onContentChange) {
      onContentChange(content);
    }
  };

  const handleMetadataChange = (name: string, value: string) => {
    if (onMetadataChange) {
      onMetadataChange(name, value);
    }
  };


  // Render error state
  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-6 rounded-lg text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => setError(null)}
          className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading editor...</p>
      </div>
    );
  }

  // User info display for edit mode
  const renderUserInfoBanner = () => {
    if (mode !== 'edit' || !userProfile || !autoPopulateUserData) return null;

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


  // Render the appropriate component based on mode and type
  const renderComponent = () => {
    try {
      // Edit mode components
      if (mode === 'edit') {
        switch (type) {
          case 'file':
            return (
              <FileUploader
                onFilesSelected={handleFilesSelected}
                onTopicChange={handleTopicChange}
                acceptedTypes={acceptedTypes}
                maxFileSizeMB={maxFileSizeMB}
                subcategory={subcategory}
                initialTopic={initialTopic}
              />
            );
          case 'text':
            return (
              <TextUploader
                onContentChange={handleContentChange}
                initialContent={initialContent}
              />
            );
          case 'video':
            return (
              <VideoUploader
                onVideoSelected={handleVideoSelected}
                maxFileSizeMB={maxFileSizeMB}
              />
            );
          default:
            throw new Error(`Unsupported editor type: ${type}`);
        }
      }
      // Preview mode components
      else if (mode === 'preview') {
        switch (type) {
          case 'file':
            return (
              <FilePreview
                type={fileType}
                materialInfo={materialInfo}
              />
            );
          case 'text':
            return (
              <TextPreview
                materialInfo={materialInfo}
              />
            );
          case 'video':
            return (
              <VideoPreview
                materialInfo={materialInfo}
              />
            );
          default:
            throw new Error(`Unsupported preview type: ${type}`);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Component rendering error';
      setError(errorMsg);
      console.error('MaterialEditor render error:', err);
      return null;
    }
  };

  return (
    <div className="material-editor w-full">
      {/* User info banner */}
      {renderUserInfoBanner()}

      {/* Always show InfoForm in edit mode */}
      {mode === 'edit' && (
        <div className="mb-8">
          <InfoForm
            materialInfo={materialInfo}
            onChange={onChange}
            onMetadataChange={handleMetadataChange}
            onSelectMaterial={onSelectMaterial}
            userProfile={userProfile}
          />
        </div>
      )}

      {/* Render the main content editor/preview */}
      <div className="editor-content">
        {renderComponent()}
      </div>

      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <h3 className="font-bold mb-2">Debug Info (MaterialEditor)</h3>
          <p>Mode: {mode}</p>
          <p>Type: {type}</p>
          <p>Subcategory: {subcategory || 'N/A'}</p>
          <p>Files: {materialInfo.files?.length || 0}</p>
          <p>Video Source: {materialInfo.videoSource ? 'Present' : 'None'}</p>
          <p>User Profile: {userProfile ? 'Present' : 'None'}</p>
          <p>Auto-populate: {autoPopulateUserData ? 'Enabled' : 'Disabled'}</p>
          <p>User Data Populated: {userDataPopulated ? 'Yes' : 'No'}</p>
          <p>Author Name: {materialInfo.authorName || 'Empty'}</p>
          <p>School: {materialInfo.school || 'Empty'}</p>
          <p>Department: {materialInfo.department || 'Empty'}</p>
        </div>
      )}
    </div>
  );
};