// components/upload/MaterialEditor.tsx
"use client";

import { useState, useEffect } from "react";
import { InfoForm } from "./Infoform";
import { FileUploader } from "./FileUploader";
import { TextUploader } from "./TextUploader";
import { VideoUploader } from "./VideoUploader";
import { FilePreview } from "@/components/preview/filePreview";
import { TextPreview } from "@/components/preview/TextPreview";
import { VideoPreview } from "@/components/preview/VideoPreview";
import {
  MaterialCategory,
  MaterialSubcategory,
  MaterialInfo,
  VideoSource,
} from "@/types/materialUpload";
import { User } from "@/context/userContext";
import { useMaterial } from "@/context/materialContext";
// import { MaterialInput } from "@/models/materialModel";

export type MaterialEditorMode = "edit" | "preview";
export type MaterialEditorType = "file" | "text" | "video";

type MaterialEditorProps = {
  mode: MaterialEditorMode;
  type: MaterialEditorType;
  materialInfo: MaterialInfo;
  userProfile?: User | null;
  onSuccess?: () => void;
  onCancel?: () => void;

  onChange: (name: string, value: string) => void;
  onMetadataChange?: (name: string, value: string) => void;
  onSelectMaterial: (
    category: MaterialCategory,
    subcategory: MaterialSubcategory
  ) => void;
  onFilesSelected?: (files: File[] | null) => void;
  onVideoSelected?: (videoSource: VideoSource | null) => void; // Separate handler for video
  onTopicChange?: (topic: string) => void;
  onContentChange?: (content: string) => void;
  acceptedTypes?: string;
  maxFileSizeMB?: number;
  subcategory?: MaterialSubcategory | null;
  initialTopic?: string;
  initialContent?: string;
  fileType?: "pdf" | "image"; // For FilePreview
  autoPopulateUserData?: boolean;
  onSubmit?: () => Promise<boolean>;
};

type Step = {
  id: number;
  title: string;
  description: string;
  component: "info" | "content" | "preview" | "final";
};

const STEPS: Step[] = [
  {
    id: 1,
    title: "Material Information",
    description: "Enter basic material details and metadata",
    component: "info",
  },
  {
    id: 2,
    title: "Content Upload",
    description: "Upload or create your material content",
    component: "content",
  },
  {
    id: 3,
    title: "Data Preview & Upload",
    description: "Preview data and upload files to cloud storage",
    component: "preview",
  },
  {
    id: 4,
    title: "Final Review",
    description: "Review complete material before submission",
    component: "final",
  },
];

export const MaterialEditor = (props: MaterialEditorProps) => {
  const {
    mode,
    type,
    materialInfo,
    userProfile,
    onChange,
    onCancel,
    onSuccess,
    onMetadataChange,
    onFilesSelected,
    onVideoSelected,
    onTopicChange,
    onContentChange,
    acceptedTypes = ".pdf,.jpg,.jpeg,.png",
    maxFileSizeMB = 50,
    subcategory,
    initialTopic,
    initialContent,
    fileType = "pdf",
    autoPopulateUserData = true,
  } = props;

  const [currentStep, setCurrentStep] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userDataPopulated, setUserDataPopulated] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right"
  );
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: string }>(
    {}
  );
  // For PDF: map file.name to signedUrl
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});

  const { uploadFileToCloud, uploadProgress: contextUploadProgress } =
    useMaterial();
  const [localMaterialInfo, setLocalMaterialInfo] =
    useState<MaterialInfo>(materialInfo);
    const { uploadMaterial, setError, fetchMaterials } = useMaterial();

  // Auto-populate user data when component mounts or user profile changes
  useEffect(() => {
    if (
      autoPopulateUserData &&
      userProfile &&
      !userDataPopulated &&
      mode === "edit"
    ) {
      try {
        console.log("MaterialEditor: Auto-populating user data");

        // Auto-populate user information if not already set
        const fieldsToPopulate = [
          { key: "uploaderName", value: userProfile.fullName || "" },
          { key: "uploaderRole", value: userProfile.role || "student" },
          { key: "schoolName", value: userProfile.school || "" },
          { key: "facultyName", value: userProfile.faculty || "" },
          { key: "departmentName", value: userProfile.department || "" },
          { key: "level", value: userProfile.level || "" },
        ];

        // Only populate empty fields to avoid overwriting existing data
        fieldsToPopulate.forEach(({ key, value }) => {
          if (
            value &&
            (!materialInfo[key as keyof MaterialInfo] ||
              materialInfo[key as keyof MaterialInfo] === "")
          ) {
            onChange(key, value);
          }
        });

        // Auto-populate metadata if onMetadataChange is available
        if (onMetadataChange) {
          const metadataToPopulate = [
            { key: "upid", value: userProfile.upid || "" },
            { key: "uuid", value: userProfile.uuid || "" },
            { key: "regNumber", value: userProfile.regNumber || "" },
            {
              key: "isVerified",
              value: userProfile.isVerified?.toString() || "false",
            },
            { key: "phone", value: userProfile.phone || "" },
            { key: "gender", value: userProfile.gender || "" },
            {
              key: "dob",
              value: userProfile.dob ? userProfile.dob.toISOString() : "",
            },
          ];

          metadataToPopulate.forEach(({ key, value }) => {
            if (
              value &&
              (!materialInfo.metadata?.[key] ||
                materialInfo.metadata[key] === "")
            ) {
              onMetadataChange(key, value);
            }
          });
        }

        // Set default session to current academic year if not set
        if (!materialInfo.session || materialInfo.session === "") {
          const currentYear = new Date().getFullYear();
          const academicSession = `${currentYear}/${currentYear + 1}`;
          onChange("session", academicSession);
        }

        setUserDataPopulated(true);
        console.log("MaterialEditor: User data auto-population completed");
      } catch (err) {
        console.error("MaterialEditor: Error auto-populating user data:", err);
        setLocalError("Failed to auto-populate user data");
      }
    }
  }, [
    userProfile,
    autoPopulateUserData,
    userDataPopulated,
    mode,
    onChange,
    onMetadataChange,
    materialInfo,
  ]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setLocalMaterialInfo(materialInfo);
  }, [materialInfo]);

  const handleInternalSubmit = async (): Promise<boolean> => {
    try {
      const info = localMaterialInfo;
      const formData = new FormData();
      const serverMaterialType =
        type === "file"
          ? "PDF"
          : type === "video"
          ? "VIDEO"
          : type === "text"
          ? "TEXT"
          : "PDF";

      formData.append("materialTitle", info.materialTitle);
      formData.append("materialDescription", info.materialDescription || "");

      formData.append("schoolName", info.schoolName || "");
      formData.append("facultyName", info.facultyName || "");
      formData.append("departmentName", info.departmentName || "");
      formData.append("level", info.level || "");

      formData.append("pdfUrl", info.pdfUrl || "");
      formData.append("fileName", info.fileName || "");

      formData.append("courseName", info.course || "");
      formData.append("courseId", info.courseId || "");
      formData.append("semester", info.semester || "");
      formData.append("session", info.session || "");

      formData.append("category", info.category || "");
      formData.append("subcategory", info.subcategory || "");
      formData.append("topic", info.topic || "");

      formData.append(
        "isPublic",
        info.visibility === "public" ? "true" : "false"
      );

      formData.append("uploaderName", info.uploaderName || "");
      formData.append("uploaderRole", info.uploaderRole || "");
      formData.append(
        "uploaderUpid",
        info.uploaderRole || userProfile?.upid || ""
      );

      if (info.tags?.length) {
        formData.append("tags", JSON.stringify(info.tags));
      }

      if (info.metadata) {
        const stringified = Object.fromEntries(
          Object.entries(info.metadata).map(([k, v]) => [k, String(v)])
        );
        formData.append("metadata", JSON.stringify(stringified));
      }

      // Type-specific handling
      if (type === "file" && info.files) {
        // For file uploads, we might need to include the actual file
        formData.append("file", info.files[0]);
        formData.append("materialType", serverMaterialType);

        // Include file metadata
        formData.append(
          "fileSize",
          info.fileSize?.toString() || info.files[0].size.toString()
        );
        formData.append("mimeType", info.format || info.files[0].type);
        formData.append(
          "originalFileName",
          info.originalFileName || info.files[0].name
        );
      }

      if (type === "text" && info.textContent) {
        formData.append("textContent", info.textContent);
        formData.append("materialType", "TEXT");
      }

      if (type === "video" && info.videoSource) {
        if (info.videoSource.type === "file") {
          formData.append("videoFile", info.videoSource.data);
        } else if (info.videoSource.type === "url") {
          formData.append("videoUrl", info.videoSource.data);
        }
        formData.append(
          "videoMetadata",
          JSON.stringify(info.videoSource.metadata)
        );
        formData.append("materialType", "VIDEO");
      }

      // Debug logging
      console.log("FormData being sent:");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const success = await uploadMaterial(formData);
      if (success) {
        await fetchMaterials();
        onSuccess?.();
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed.";
      setError(message);
      return false;
    }
  };

  // Validation functions for each step
  const validateStep1 = (): boolean => {
    console.log("Validating Step 1 with materialInfo:", materialInfo);

    // Check required fields - make sure we're checking the right properties
    const requiredFields = [
      { key: "uploaderName", value: materialInfo.uploaderName },
      { key: "schoolName", value: materialInfo.schoolName },
      { key: "facultyName", value: materialInfo.facultyName },
      { key: "departmentName", value: materialInfo.departmentName },
      { key: "category", value: materialInfo.category },
      { key: "subcategory", value: materialInfo.subcategory },
      { key: "course", value: materialInfo.course },
      { key: "courseId", value: materialInfo.courseId },
    ];

    const isValid = requiredFields.every((field) => {
      const isFieldValid = field.value && field.value.toString().trim() !== "";
      console.log(
        `Field ${field.key}: ${field.value} - Valid: ${isFieldValid}`
      );
      return isFieldValid;
    });

    console.log("Step 1 validation result:", isValid);
    return isValid;
  };

  const validateStep2 = (): boolean => {
    console.log("Validating Step 2, type:", type);
    console.log("Title:", materialInfo.materialTitle);
    console.log("Files:", materialInfo.files);
    console.log("Text content:", materialInfo.textContent);
    console.log("Video source:", materialInfo.videoSource);

    // Validate title first
    if (
      !materialInfo.materialTitle ||
      materialInfo.materialTitle.trim() === ""
    ) {
      console.log("Title validation failed");
      return false;
    }

    if (type === "file") {
      const isValid = !!materialInfo.files && materialInfo.files.length > 0;
      console.log("File validation result:", isValid);
      return isValid;
    }
    if (type === "text") {
      const isValid = Boolean(
        materialInfo.textContent && materialInfo.textContent.trim() !== ""
      );
      console.log("Text validation result:", isValid);
      return isValid;
    }
    if (type === "video") {
      const isValid = materialInfo.videoSource !== null;
      console.log("Video validation result:", isValid);
      return isValid;
    }
    return false;
  };

  const validateStep3 = (): boolean => {
    if (type === "file" && materialInfo.files) {
      return materialInfo.files.every((file) => uploadedFiles[file.name]);
    }
    return true;
  };

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < STEPS.length) {
      setSlideDirection("right");
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setSlideDirection("left");
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = (): boolean => {
    let canProceed = false;

    switch (currentStep) {
      case 1:
        canProceed = validateStep1();
        break;
      case 2:
        canProceed = validateStep2();
        break;
      case 3:
        canProceed = validateStep3();
        break;
      default:
        canProceed = true;
    }

    console.log(`Can proceed from step ${currentStep}:`, canProceed);
    return canProceed;
  };

  // File upload to cloud storage
  const handleUploadToCloud = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

      const result = await uploadFileToCloud(file);

      if (result.success) {
        setUploadedFiles((prev) => ({ ...prev, [file.name]: result.url }));
        // For PDF, get signed URL after upload
        if (
          type === "file" &&
          file.type === "application/pdf" &&
          result.fileName
        ) {
          try {
            const res = await fetch(
              `/api/signed-url?file=${encodeURIComponent(result.fileName)}`
            );
            if (res.ok) {
              const { url: signedUrl } = await res.json();
              setSignedUrls((prev) => ({ ...prev, [file.name]: signedUrl }));

              onChange("pdfUrl", signedUrl || result.url);
              onChange("fileName", result.fileName);
              onChange("materialType", "PDF");
              onChange("schoolName", materialInfo.schoolName);
              onChange("facultyName", materialInfo.facultyName);
              onChange("departmentName", materialInfo.departmentName);
              updateInfo("pdfUrl", signedUrl || result.url);
              updateInfo("fileName", result.fileName);
              updateInfo("materialType", "PDF");
              updateInfo("fileSize", file.size);
              updateInfo("format", file.type);
              updateInfo("originalFileName", file.name);
            } else {
              onChange("pdfUrl", result.url);
              onChange("fileName", result.fileName);
              onChange("schoolName", materialInfo.schoolName);
              onChange("facultyName", materialInfo.facultyName);
              onChange("departmentName", materialInfo.departmentName);
              updateInfo("pdfUrl", result.url);
            updateInfo("fileName", result.fileName);
            updateInfo("materialType", "PDF");
            updateInfo("fileSize", file.size);
            updateInfo("format", file.type);
            updateInfo("originalFileName", file.name);
            }
          } catch {
            onChange("pdfUrl", result.url);
            onChange("fileName", result.fileName);
            onChange("schoolName", materialInfo.schoolName);
            onChange("facultyName", materialInfo.facultyName);
            onChange("departmentName", materialInfo.departmentName);
            updateInfo("pdfUrl", result.url);
            updateInfo("fileName", result.fileName);
            updateInfo("materialType", "PDF");
            updateInfo("fileSize", file.size);
            updateInfo("format", file.type);
            updateInfo("originalFileName", file.name);
          }
        } else if (type === "file") {
          // For non-PDF files, just use the direct url
          onChange("pdfUrl", result.url);
          onChange("fileName", result.fileName);
          onChange("schoolName", materialInfo.schoolName);
          onChange("facultyName", materialInfo.facultyName);
          onChange("departmentName", materialInfo.departmentName);
          updateInfo("pdfUrl", result.url);
            updateInfo("fileName", result.fileName);
            updateInfo("materialType", "PDF");
            updateInfo("fileSize", file.size);
            updateInfo("format", file.type);
            updateInfo("originalFileName", file.name);
        }

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

        // Clear progress after delay
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 2000);

        return result.url;
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setLocalError(
        `Failed to upload ${file.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
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

  const updateInfo = <K extends keyof MaterialInfo>(
    key: K,
    value: MaterialInfo[K]
  ) => {
    setLocalMaterialInfo((prev) => ({ ...prev, [key]: value }));

    props.onChange(key, String(value));
  };

  const updateMetadata = (key: string, value: string) => {
    setLocalMaterialInfo((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value,
      },
    }));

    if (props.onMetadataChange) {
      props.onMetadataChange(key, value);
    }
  };

  const handleSubmit = async () => {
    if (handleInternalSubmit || props.onSubmit) {
      setIsLoading(true);
      try {
        const success = await handleInternalSubmit();
        if (success) {
          // setCurrentStep(1);
          onSuccess?.();
          onCancel?.();
          props.onCancel?.();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Submission failed. Please try again.";
        setLocalError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Render step progress bar
  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep > step.id
                  ? "bg-green-500 text-white"
                  : currentStep === step.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {currentStep > step.id ? "✓" : step.id}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mx-4 ${
                  currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {STEPS[currentStep - 1].title}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          {STEPS[currentStep - 1].description}
        </p>
      </div>
    </div>
  );

  // Render error state
  if (localError) {
    return (
      <div className="border border-red-200 bg-red-50 p-6 rounded-lg text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
        <p className="text-red-600 mb-4">{localError}</p>
        <button
          onClick={() => setLocalError(null)}
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
    if (mode !== "edit" || !userProfile || !autoPopulateUserData) return null;

    return (
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {userProfile.fullName?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">
              Auto-populated with your profile information
            </p>
            <p className="text-xs text-green-600">
              {userProfile.fullName} • {userProfile.department} •{" "}
              {userProfile.level}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    const step = STEPS[currentStep - 1];

    switch (step.component) {
      case "info":
        return (
          <InfoForm
            materialInfo={localMaterialInfo}
            onChange={(name, value) =>
              updateInfo(name as keyof MaterialInfo, value)
            }
            onMetadataChange={updateMetadata}
            onSelectMaterial={(category, subcategory) => {
              updateInfo("category", category);
              updateInfo("subcategory", subcategory);
            }}
            userProfile={userProfile}
            autoPopulateUserData={true}
          />
        );

      case "content":
        switch (type) {
          case "file":
            return (
              <FileUploader
                onFilesSelected={handleFilesSelected}
                onTopicChange={handleTopicChange}
                acceptedTypes={acceptedTypes}
                maxFileSizeMB={maxFileSizeMB}
                subcategory={subcategory}
                initialTopic={initialTopic}
                title={materialInfo.materialTitle}
               onTitleChange={(value) => updateInfo("materialTitle", value)}
              />
            );
          case "text":
            return (
              <TextUploader
                onContentChange={handleContentChange}
                initialContent={initialContent}
                title={materialInfo.materialTitle}
               onTitleChange={(value) => updateInfo("materialTitle", value)}
              />
            );
          case "video":
            return (
              <VideoUploader
                onVideoSelected={handleVideoSelected}
                maxFileSizeMB={maxFileSizeMB}
                title={materialInfo.materialTitle}
               onTitleChange={(value) => updateInfo("materialTitle", value)}
              />
            );
          default:
            return <div>Unsupported content type</div>;
        }

      case "preview":
        return (
          <div className="space-y-6">
            {/* Material Data Preview */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">
                Material Information Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Title:</span>
                  <span className="ml-2">
                    {materialInfo.materialTitle || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Author:</span>
                  <span className="ml-2">
                    {materialInfo.uploaderName || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">School:</span>
                  <span className="ml-2">
                    {materialInfo.schoolName || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Department:</span>
                  <span className="ml-2">
                    {materialInfo.departmentName || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="ml-2">
                    {materialInfo.category || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Subcategory:
                  </span>
                  <span className="ml-2">
                    {materialInfo.subcategory || "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            {type === "file" &&
              materialInfo.files &&
              materialInfo.files.length > 0 && (
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    File Upload to Cloud Storage
                  </h3>
                  <div className="space-y-4">
                    {materialInfo.files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {uploadProgress[file.name] !== undefined && (
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${uploadProgress[file.name]}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm">
                                {uploadProgress[file.name]}%
                              </span>
                            </div>
                          )}

                          {uploadedFiles[file.name] ? (
                            <div className="flex items-center space-x-2 text-green-600">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span className="text-sm font-medium">
                                Uploaded
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleUploadToCloud(file)}
                              disabled={isUploading}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUploading ? "Uploading..." : "Upload"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Content Preview */}
            {type === "text" && materialInfo.textContent && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">
                  Text Content Preview
                </h3>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">
                    {materialInfo.textContent}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case "final":
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">
                Complete Material Preview
              </h3>

              {/* Use the existing preview components */}
              {type === "file" && (
                <FilePreview
                  type={fileType}
                  materialInfo={{
                    ...materialInfo,
                    uploadedFileUrl:
                      materialInfo.files && materialInfo.files[0]
                        ? // Use signedUrl for PDF, else fallback to uploadedFiles
                          materialInfo.files[0].type === "application/pdf" &&
                          signedUrls[materialInfo.files[0].name]
                          ? signedUrls[materialInfo.files[0].name]
                          : uploadedFiles[materialInfo.files[0].name] || ""
                        : "",
                  }}
                />
              )}

              {type === "text" && <TextPreview materialInfo={materialInfo} />}

              {type === "video" && <VideoPreview materialInfo={materialInfo} />}
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-green-800 font-medium">
                  Material is ready for submission
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Invalid step</div>;
    }
  };

  // Render navigation buttons
  const renderNavigation = () => {
    const canProceed = canProceedToNext();

    return (
      <div className="flex justify-between mt-8">
        <button
          onClick={goToPrevStep}
          disabled={currentStep === 1}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex space-x-3">
          {/* Debug info for current step */}
          {process.env.NODE_ENV === "development" && (
            <div className="px-3 py-2 bg-gray-100 rounded text-xs">
              Step {currentStep}: {canProceed ? "Valid" : "Invalid"}
            </div>
          )}

          {currentStep < STEPS.length ? (
            <button
              onClick={goToNextStep}
              disabled={!canProceedToNext()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading || !canProceedToNext()}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Material"
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (localError) {
    return (
      <div className="border border-red-200 bg-red-50 p-6 rounded-lg text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
        <p className="text-red-600 mb-4">{localError}</p>
        <button
          onClick={() => setLocalError(null)}
          className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="material-editor w-full max-w-4xl mx-auto">
      {/* User info banner */}
      {renderUserInfoBanner()}
      {renderProgressBar()}

      <div className="relative overflow-hidden">
        <div
          className={`transition-transform duration-300 ease-in-out ${
            slideDirection === "right"
              ? "transform translate-x-0"
              : "transform translate-x-0"
          }`}
        >
          {renderStepContent()}
        </div>
      </div>

      {renderNavigation()}

      {/* Upload Progress Indicator */}
      {contextUploadProgress?.isUploading && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            <div>
              <p className="font-medium">
                Uploading {contextUploadProgress.fileName}
              </p>
              <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${contextUploadProgress.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Debug information */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <h3 className="font-bold mb-2">Debug Info (MaterialEditor)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Basic Info:</strong>
              </p>
              <p>Mode: {mode}</p>
              <p>Type: {type}</p>
              <p>Current Step: {currentStep}</p>
              <p>Can Proceed: {canProceedToNext() ? "Yes" : "No"}</p>
            </div>
            <div>
              <p>
                <strong>Material Info (All Required Fields):</strong>
              </p>
              <p>materialTitle: {materialInfo.materialTitle || "Empty"}</p>
              <p>
                materialDescription:{" "}
                {materialInfo.materialDescription || "Empty"}
              </p>
              <p>materialType: {materialInfo.materialType || "Empty"}</p>
              <p>pdfUrl: {materialInfo.pdfUrl || "Empty"}</p>
              <p>fileName: {materialInfo.fileName || "Empty"}</p>
              <p>schoolName: {materialInfo.schoolName || "Empty"}</p>
              <p>facultyName: {materialInfo.facultyName || "Empty"}</p>
              <p>departmentName: {materialInfo.departmentName || "Empty"}</p>
              <p>courseName: {materialInfo.course || "Empty"}</p>
              <p>courseId: {materialInfo.courseId || "Empty"}</p>
              <p>uploaderName: {materialInfo.uploaderName || "Empty"}</p>
              <p>uploaderUpid: {materialInfo.metadata?.upid || "Empty"}</p>
              <p>uploaderRole: {materialInfo.uploaderRole || "Empty"}</p>
              <p>
                fileSize:{" "}
                {materialInfo.fileSize ||
                  (materialInfo.files && materialInfo.files[0]
                    ? materialInfo.files[0].size
                    : "Empty")}
              </p>
              <p>
                format:{" "}
                {materialInfo.format ||
                  (materialInfo.files && materialInfo.files[0]
                    ? materialInfo.files[0].type
                    : "Empty")}
              </p>
              <p>
                originalFileName:{" "}
                {materialInfo.originalFileName ||
                  (materialInfo.files && materialInfo.files[0]
                    ? materialInfo.files[0].name
                    : "Empty")}
              </p>
              <p>status: {materialInfo.status || "Empty"}</p>
              <p>
                isApproved:{" "}
                {materialInfo.isApproved !== undefined
                  ? materialInfo.isApproved.toString()
                  : "Empty"}
              </p>
              <p>
                isPublic:{" "}
                {materialInfo.isPublic !== undefined
                  ? materialInfo.isPublic.toString()
                  : "Empty"}
              </p>
              <p>
                tableOfContent:{" "}
                {materialInfo.tableOfContent
                  ? JSON.stringify(materialInfo.tableOfContent)
                  : "Empty"}
              </p>
              <p>
                tags:{" "}
                {materialInfo.tags && materialInfo.tags.length > 0
                  ? materialInfo.tags.join(", ")
                  : "Empty"}
              </p>
              <p>
                keywords:{" "}
                {materialInfo.keywords && materialInfo.keywords.length > 0
                  ? materialInfo.keywords.join(", ")
                  : "Empty"}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <p>
              <strong>Step Validations:</strong>
            </p>
            <p>Step 1: {validateStep1() ? "Valid" : "Invalid"}</p>
            <p>Step 2: {validateStep2() ? "Valid" : "Invalid"}</p>
            <p>Step 3: {validateStep3() ? "Valid" : "Invalid"}</p>
          </div>
        </div>
      )}
    </div>
  );
};
