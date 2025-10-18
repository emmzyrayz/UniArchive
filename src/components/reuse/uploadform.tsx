"use client";

import {
  useState,
  useRef,
  ChangeEvent,
  DragEvent,
  useCallback,
  useMemo,
} from "react";
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  Alert,
  Checkbox,
} from "@/components/UI";
import { LuCloudUpload, LuX, LuCheck, LuFile } from "react-icons/lu";
import React from "react";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  url?: string;
}

interface FormData {
  title: string;
  description: string;
  category: string;
  tags: string;
  isPublic: boolean;
}

interface UploadFormProps {
  onUpload: (files: UploadedFile[], formData: FormData) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  categories?: Array<{ value: string; label: string }>;
  loading?: boolean;
  className?: string;
}

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export default function UploadForm({
  onUpload,
  accept = "*",
  maxSize = 100,
  maxFiles = 10,
  categories = [],
  loading = false,
  className = "",
}: UploadFormProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    tags: "",
    isPublic: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Memoized validation logic
  const validateFile = useCallback(
    (file: File): string | undefined => {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        return `File size must be less than ${maxSize}MB`;
      }

      if (accept !== "*") {
        const acceptedTypes = accept.split(",").map((type) => type.trim());
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
        const fileType = file.type;

        const isValid = acceptedTypes.some((type) => {
          if (type.startsWith(".")) return type.toLowerCase() === fileExtension;
          return type.toLowerCase() === fileType;
        });

        if (!isValid) {
          return `File type not allowed. Accepted: ${accept}`;
        }
      }

      return undefined;
    },
    [maxSize, accept]
  );

  // Drag handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Simulate upload with cleanup
  const simulateUpload = useCallback((fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        uploadTimersRef.current.delete(fileId);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  progress: 100,
                  status: "completed",
                  url: URL.createObjectURL(f.file),
                }
              : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
        );
      }
    }, 150);

    uploadTimersRef.current.set(fileId, interval);
  }, []);

  // Process dropped/selected files
  const handleFiles = useCallback(
    (newFiles: File[]) => {
      setUploadError(null);

      if (files.length + newFiles.length > maxFiles) {
        setUploadError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const validFiles: UploadedFile[] = newFiles.map((file) => {
        const error = validateFile(file);
        const id = generateId();
        const status: UploadedFile["status"] = error ? "error" : "uploading";

        return {
          id,
          file,
          progress: 0,
          status,
          error,
        };
      });

      setFiles((prev) => [...prev, ...validFiles]);

      validFiles.forEach((file) => {
        if (file.status === "uploading") {
          simulateUpload(file.id);
        }
      });
    },
    [files.length, maxFiles, validateFile, simulateUpload]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(Array.from(e.target.files || []));
    },
    [handleFiles]
  );

  const removeFile = useCallback((fileId: string) => {
    const timer = uploadTimersRef.current.get(fileId);
    if (timer) clearInterval(timer);
    uploadTimersRef.current.delete(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleSubmit = useCallback(() => {
    if (files.length === 0) {
      setUploadError("Please upload at least one file");
      return;
    }

    const completedFiles = files.filter((f) => f.status === "completed");
    if (completedFiles.length === 0) {
      setUploadError("Please wait for files to finish uploading");
      return;
    }

    if (!formData.title.trim()) {
      setUploadError("Please provide a title");
      return;
    }

    setUploadError(null);
    onUpload(completedFiles, formData);
  }, [files, formData, onUpload]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetForm = useCallback(() => {
    files.forEach((f) => {
      const timer = uploadTimersRef.current.get(f.id);
      if (timer) clearInterval(timer);
    });
    uploadTimersRef.current.clear();
    setFiles([]);
    setFormData({
      title: "",
      description: "",
      category: "",
      tags: "",
      isPublic: false,
    });
    setUploadError(null);
  }, [files]);

  // Memoized stats
  const stats = useMemo(
    () => ({
      completed: files.filter((f) => f.status === "completed").length,
      hasCompleted: files.some((f) => f.status === "completed"),
      canSubmit:
        files.some((f) => f.status === "completed") && formData.title.trim(),
      totalSize: (
        files.reduce((sum, f) => sum + f.file.size, 0) /
        (1024 * 1024)
      ).toFixed(2),
    }),
    [files, formData.title]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    const timersRef = uploadTimersRef.current;
    return () => {
      timersRef.forEach((timer) => clearInterval(timer));
      timersRef.clear();
    };
  }, []);

  return (
    <Card variant="elevated" padding="md" className={className}>
      <div className="space-y-6">
        {/* Upload Error Alert */}
        {uploadError && (
          <Alert
            type="error"
            message={uploadError}
            closable
            onClose={() => setUploadError(null)}
          />
        )}

        {/* File Upload Area */}
        {files.length === 0 ? (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
              ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-105"
                  : "border-gray-300 hover:border-indigo-400 dark:border-gray-600"
              }
            `}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && triggerFileInput()}
          >
            <LuCloudUpload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Drag and drop your files here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              or click to browse files
            </p>
            <Button
              variant="outline"
              label="Browse Files"
              onClick={(e) => {
                e?.stopPropagation();
                triggerFileInput();
              }}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Max size: {maxSize}MB • Max files: {maxFiles} • Accepted: {accept}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              onChange={handleFileInput}
              className="hidden"
              aria-label="File upload input"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Files ({stats.completed}/{files.length})
              </h3>
              {files.length < maxFiles && (
                <Button
                  variant="outline"
                  label="Add More"
                  onClick={triggerFileInput}
                />
              )}
            </div>

            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    {file.status === "completed" ? (
                      <LuCheck className="w-6 h-6 text-emerald-500" />
                    ) : file.status === "error" ? (
                      <LuX className="w-6 h-6 text-red-500" />
                    ) : (
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <LuFile className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.file.name}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>

                    {/* Progress Bar */}
                    {file.status === "uploading" && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {file.error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {file.error}
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    aria-label="Remove file"
                  >
                    <LuX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Fields */}
        {stats.hasCompleted && (
          <div className="space-y-4 border-t dark:border-gray-700 pt-6">
            <Input
              name="title"
              label="Title"
              placeholder="Enter a title for your upload"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />

            <Textarea
              name="description"
              label="Description"
              placeholder="Describe what you're uploading"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
            />

            {categories.length > 0 && (
              <Select
                name="category"
                label="Category"
                placeholder="Select a category"
                options={categories}
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            )}

            <Input
              name="tags"
              label="Tags"
              placeholder="Add tags separated by commas"
              value={formData.tags}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tags: e.target.value }))
              }
              helperText="Use commas to separate multiple tags"
            />

            <Checkbox
              label="Make this content public"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isPublic: e.target.checked,
                }))
              }
            />
          </div>
        )}

        {/* Submit Button */}
        {stats.hasCompleted && (
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button variant="outline" label="Cancel" onClick={resetForm} />
            <Button
              variant="primary"
              label={loading ? "Uploading..." : "Upload Files"}
              loading={loading}
              disabled={!stats.canSubmit || loading}
              onClick={handleSubmit}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// // ============================================
// // Usage Examples: UploadForm Component
// // ============================================

// "use client";

// import { useToast } from "@/components/reuse";
// import UploadForm from "@/components/UI/uploadform";
// import { useState } from "react";

// interface UploadedFile {
//   id: string;
//   file: File;
//   progress: number;
//   status: "uploading" | "completed" | "error";
//   error?: string;
//   url?: string;
// }

// interface FormData {
//   title: string;
//   description: string;
//   category: string;
//   tags: string;
//   isPublic: boolean;
// }

// // ============================================
// // 1. Course Materials Upload
// // ============================================

// export function CourseMaterielsUpload() {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const courseCategories = [
//     { value: "lecture", label: "Lecture Notes" },
//     { value: "slides", label: "Presentation Slides" },
//     { value: "reading", label: "Reading Materials" },
//     { value: "assignment", label: "Assignment" },
//   ];

//   const handleUpload = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       // Prepare files for upload
//       const uploadData = new FormData();
//       uploadData.append("title", formData.title);
//       uploadData.append("description", formData.description);
//       uploadData.append("category", formData.category);
//       uploadData.append("tags", formData.tags);
//       uploadData.append("isPublic", String(formData.isPublic));

//       files.forEach((file, index) => {
//         uploadData.append(`files[${index}]`, file.file);
//       });

//       const response = await fetch("/api/courses/materials", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Upload failed");

//       const result = await response.json();

//       toast.success(
//         "Materials Uploaded!",
//         `${files.length} file(s) added to your course.`,
//         {
//           duration: 4000,
//           action: {
//             label: "View Course",
//             onClick: () => {
//               window.location.href = `/courses/${result.courseId}`;
//             },
//           },
//         }
//       );
//     } catch (error) {
//       toast.error(
//         "Upload Failed",
//         error instanceof Error ? error.message : "Could not upload materials",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleUpload}
//       accept=".pdf,.doc,.docx,.ppt,.pptx"
//       maxSize={50}
//       maxFiles={5}
//       categories={courseCategories}
//       loading={isLoading}
//       className="max-w-2xl"
//     />
//   );
// }

// // ============================================
// // 2. Student Assignment Submission
// // ============================================

// export function AssignmentSubmission({ assignmentId }: { assignmentId: string }) {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const handleSubmit = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       const uploadData = new FormData();
//       uploadData.append("assignmentId", assignmentId);
//       uploadData.append("submissionTitle", formData.title);
//       uploadData.append("notes", formData.description);

//       files.forEach((file, index) => {
//         uploadData.append(`submissions[${index}]`, file.file);
//       });

//       const response = await fetch("/api/assignments/submit", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Submission failed");

//       const result = await response.json();

//       toast.success(
//         "Assignment Submitted!",
//         "Your submission has been received. Your instructor will grade it soon.",
//         {
//           duration: 5000,
//           action: {
//             label: "View Submission",
//             onClick: () => {
//               window.location.href = `/assignments/${assignmentId}/submissions/${result.submissionId}`;
//             },
//           },
//         }
//       );
//     } catch (error) {
//       toast.error(
//         "Submission Failed",
//         error instanceof Error ? error.message : "Could not submit assignment",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleSubmit}
//       accept=".pdf,.doc,.docx,.zip,.txt"
//       maxSize={25}
//       maxFiles={3}
//       loading={isLoading}
//       className="max-w-2xl"
//     />
//   );
// }

// // ============================================
// // 3. Media Upload (Video/Images)
// // ============================================

// export function MediaUpload() {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const mediaCategories = [
//     { value: "thumbnail", label: "Course Thumbnail" },
//     { value: "banner", label: "Course Banner" },
//     { value: "video", label: "Lesson Video" },
//     { value: "resource", label: "Resource Image" },
//   ];

//   const handleMediaUpload = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       const uploadData = new FormData();
//       uploadData.append("title", formData.title);
//       uploadData.append("mediaType", formData.category);
//       uploadData.append("description", formData.description);
//       uploadData.append("tags", formData.tags);

//       files.forEach((file, index) => {
//         uploadData.append(`media[${index}]`, file.file);
//       });

//       const response = await fetch("/api/media/upload", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Media upload failed");

//       const result = await response.json();

//       toast.success(
//         "Media Uploaded Successfully!",
//         `Your ${formData.category} has been uploaded and is ready to use.`,
//         { duration: 4000 }
//       );
//     } catch (error) {
//       toast.error(
//         "Upload Failed",
//         error instanceof Error ? error.message : "Could not upload media",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleMediaUpload}
//       accept=".mp4,.avi,.mov,.jpg,.jpeg,.png,.gif"
//       maxSize={500}
//       maxFiles={2}
//       categories={mediaCategories}
//       loading={isLoading}
//       className="max-w-3xl"
//     />
//   );
// }

// // ============================================
// // 4. Bulk CSV/Data Import
// // ============================================

// export function BulkStudentImport() {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const handleImport = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       // Only process CSV files for import
//       const csvFiles = files.filter((f) => f.file.type === "text/csv");

//       if (csvFiles.length === 0) {
//         toast.error("Invalid File", "Please upload a CSV file");
//         setIsLoading(false);
//         return;
//       }

//       const uploadData = new FormData();
//       uploadData.append("importType", "students");
//       uploadData.append("notes", formData.description);

//       csvFiles.forEach((file, index) => {
//         uploadData.append(`files[${index}]`, file.file);
//       });

//       const response = await fetch("/api/admin/import/students", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Import failed");

//       const result = await response.json();

//       toast.success(
//         "Import Completed!",
//         `${result.imported} students imported, ${result.skipped} skipped due to errors.`,
//         {
//           duration: 5000,
//           action: {
//             label: "View Report",
//             onClick: () => {
//               window.location.href = `/admin/import-reports/${result.reportId}`;
//             },
//           },
//         }
//       );
//     } catch (error) {
//       toast.error(
//         "Import Failed",
//         error instanceof Error ? error.message : "Could not process import",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleImport}
//       accept=".csv"
//       maxSize={10}
//       maxFiles={1}
//       loading={isLoading}
//       className="max-w-2xl"
//     />
//   );
// }

// // ============================================
// // 5. Resource Library Upload (Public)
// // ============================================

// export function ResourceLibraryUpload() {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const resourceCategories = [
//     { value: "template", label: "Template" },
//     { value: "tool", label: "Tool/Software" },
//     { value: "guide", label: "Guide/Tutorial" },
//     { value: "example", label: "Code Example" },
//     { value: "other", label: "Other" },
//   ];

//   const handleResourceUpload = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       const uploadData = new FormData();
//       uploadData.append("resourceType", formData.category);
//       uploadData.append("title", formData.title);
//       uploadData.append("description", formData.description);
//       uploadData.append("tags", formData.tags);
//       uploadData.append("visibility", formData.isPublic ? "public" : "private");

//       files.forEach((file, index) => {
//         uploadData.append(`resources[${index}]`, file.file);
//       });

//       const response = await fetch("/api/resources/library", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Resource upload failed");

//       const result = await response.json();

//       const visibility = formData.isPublic ? "publicly" : "to your students";

//       toast.success(
//         "Resource Added!",
//         `Your ${formData.category} is now available ${visibility}.`,
//         {
//           duration: 4000,
//           action: {
//             label: "View Resources",
//             onClick: () => {
//               window.location.href = "/resources";
//             },
//           },
//         }
//       );
//     } catch (error) {
//       toast.error(
//         "Upload Failed",
//         error instanceof Error ? error.message : "Could not upload resource",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleResourceUpload}
//       accept=".pdf,.doc,.docx,.zip,.json,.xml"
//       maxSize={100}
//       maxFiles={5}
//       categories={resourceCategories}
//       loading={isLoading}
//       className="max-w-2xl"
//     />
//   );
// }

// // ============================================
// // 6. Profile Picture/Avatar Upload
// // ============================================

// export function ProfilePictureUpload({ userId }: { userId: string }) {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const handleProfileUpload = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       // Only process the first image for profile picture
//       const imageFile = files[0];

//       const uploadData = new FormData();
//       uploadData.append("userId", userId);
//       uploadData.append("profilePicture", imageFile.file);

//       const response = await fetch("/api/profile/picture", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Profile picture update failed");

//       const result = await response.json();

//       toast.success(
//         "Profile Picture Updated!",
//         "Your new profile picture is now visible.",
//         { duration: 3000 }
//       );

//       // Refresh page to show new picture
//       setTimeout(() => window.location.reload(), 1000);
//     } catch (error) {
//       toast.error(
//         "Upload Failed",
//         error instanceof Error ? error.message : "Could not update profile picture",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleProfileUpload}
//       accept=".jpg,.jpeg,.png,.gif,.webp"
//       maxSize={5}
//       maxFiles={1}
//       loading={isLoading}
//       className="max-w-xl"
//     />
//   );
// }

// // ============================================
// // 7. Advanced: Upload with Progress Tracking
// // ============================================

// export function AdvancedUploadWithProgress() {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);
//   const [uploadStats, setUploadStats] = useState({
//     total: 0,
//     completed: 0,
//     failed: 0,
//   });

//   const handleAdvancedUpload = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     setUploadStats({ total: files.length, completed: 0, failed: 0 });

//     try {
//       let completed = 0;
//       let failed = 0;

//       // Upload files sequentially with progress updates
//       for (const file of files) {
//         try {
//           const uploadData = new FormData();
//           uploadData.append("file", file.file);
//           uploadData.append("title", formData.title);
//           uploadData.append("batch", formData.description);

//           const response = await fetch("/api/files/upload", {
//             method: "POST",
//             body: uploadData,
//           });

//           if (response.ok) {
//             completed++;
//             setUploadStats((prev) => ({ ...prev, completed }));
//           } else {
//             failed++;
//             setUploadStats((prev) => ({ ...prev, failed }));
//           }
//         } catch (error) {
//           failed++;
//           setUploadStats((prev) => ({ ...prev, failed }));
//         }
//       }

//       // Show summary
//       if (failed === 0) {
//         toast.success(
//           "All Files Uploaded!",
//           `${completed} file(s) successfully uploaded.`,
//           { duration: 4000 }
//         );
//       } else if (completed === 0) {
//         toast.error(
//           "Upload Failed",
//           `All ${failed} file(s) failed to upload. Please try again.`,
//           { duration: 0 }
//         );
//       } else {
//         toast.warning(
//           "Partial Success",
//           `${completed} succeeded, ${failed} failed.`,
//           { duration: 0 }
//         );
//       }
//     } catch (error) {
//       toast.error(
//         "Upload Error",
//         error instanceof Error ? error.message : "An error occurred during upload",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <UploadForm
//         onUpload={handleAdvancedUpload}
//         accept=".pdf,.doc,.docx,.xlsx"
//         maxSize={50}
//         maxFiles={10}
//         loading={isLoading}
//         className="max-w-2xl"
//       />
//       {uploadStats.total > 0 && (
//         <div className="text-sm text-gray-600 dark:text-gray-400">
//           Status: {uploadStats.completed} completed, {uploadStats.failed} failed out of {uploadStats.total}
//         </div>
//       )}
//     </div>
//   );
// }

// // ============================================
// // 8. Course Certificate Template Upload
// // ============================================

// export function CertificateTemplateUpload({ courseId }: { courseId: string }) {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const handleTemplateUpload = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       // Validate it's an image or PDF template
//       const templateFile = files[0];
//       const isValidTemplate = /\.(png|jpg|jpeg|pdf)$/i.test(templateFile.file.name);

//       if (!isValidTemplate) {
//         toast.error(
//           "Invalid Template",
//           "Certificate templates must be PNG, JPG, or PDF files.",
//           { duration: 0 }
//         );
//         setIsLoading(false);
//         return;
//       }

//       const uploadData = new FormData();
//       uploadData.append("courseId", courseId);
//       uploadData.append("template", templateFile.file);
//       uploadData.append("templateName", formData.title);

//       const response = await fetch("/api/certificates/template", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Template upload failed");

//       toast.success(
//         "Certificate Template Uploaded!",
//         "Students will now receive this certificate upon course completion.",
//         { duration: 4000 }
//       );
//     } catch (error) {
//       toast.error(
//         "Upload Failed",
//         error instanceof Error ? error.message : "Could not upload template",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleTemplateUpload}
//       accept=".png,.jpg,.jpeg,.pdf"
//       maxSize={10}
//       maxFiles={1}
//       loading={isLoading}
//       className="max-w-2xl"
//     />
//   );
// }

// // ============================================
// // 9. Quiz/Test Document Upload
// // ============================================

// export function QuizDocumentUpload({ lessonId }: { lessonId: string }) {
//   const toast = useToast();
//   const [isLoading, setIsLoading] = useState(false);

//   const quizCategories = [
//     { value: "questions", label: "Question Bank" },
//     { value: "answer-key", label: "Answer Key" },
//     { value: "rubric", label: "Grading Rubric" },
//   ];

//   const handleQuizUpload = async (files: UploadedFile[], formData: FormData) => {
//     setIsLoading(true);
//     try {
//       const uploadData = new FormData();
//       uploadData.append("lessonId", lessonId);
//       uploadData.append("quizType", formData.category);
//       uploadData.append("title", formData.title);

//       files.forEach((file, index) => {
//         uploadData.append(`quizFiles[${index}]`, file.file);
//       });

//       const response = await fetch("/api/lessons/quiz/upload", {
//         method: "POST",
//         body: uploadData,
//       });

//       if (!response.ok) throw new Error("Quiz upload failed");

//       toast.success(
//         "Quiz Materials Uploaded!",
//         "Your quiz questions and materials are now available.",
//         { duration: 4000 }
//       );
//     } catch (error) {
//       toast.error(
//         "Upload Failed",
//         error instanceof Error ? error.message : "Could not upload quiz materials",
//         { duration: 0 }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <UploadForm
//       onUpload={handleQuizUpload}
//       accept=".pdf,.doc,.docx,.xlsx"
//       maxSize={25}
//       maxFiles={3}
//       categories={quizCategories}
//       loading={isLoading}
//       className="max-w-2xl"
//     />
//   );
// }

// // ============================================
// // 10. Complete Page Example: Instructor Dashboard
// // ============================================

// export function InstructorUploadHub() {
//   const [activeTab, setActiveTab] = useState<"materials" | "media" | "resources">("materials");

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
//       <div className="max-w-4xl mx-auto space-y-6">
//         {/* Header */}
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
//             Course Content Manager
//           </h1>
//           <p className="text-gray-600 dark:text-gray-400">
//             Upload and manage course materials, media, and resources
//           </p>
//         </div>

//         {/* Tab Navigation */}
//         <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
//           <button
//             onClick={() => setActiveTab("materials")}
//             className={`px-4 py-2 font-medium border-b-2 transition-colors ${
//               activeTab === "materials"
//                 ? "border-indigo-600 text-indigo-600"
//                 : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
//             }`}
//           >
//             Course Materials
//           </button>
//           <button
//             onClick={() => setActiveTab("media")}
//             className={`px-4 py-2 font-medium border-b-2 transition-colors ${
//               activeTab === "media"
//                 ? "border-indigo-600 text-indigo-600"
//                 : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
//             }`}
//           >
//             Media Library
//           </button>
//           <button
//             onClick={() => setActiveTab("resources")}
//             className={`px-4 py-2 font-medium border-b-2 transition-colors ${
//               activeTab === "resources"
//                 ? "border-indigo-600 text-indigo-600"
//                 : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
//             }`}
//           >
//             Resources
//           </button>
//         </div>

//         {/* Tab Content */}
//         {activeTab === "materials" && <CourseMaterielsUpload />}
//         {activeTab === "media" && <MediaUpload />}
//         {activeTab === "resources" && <ResourceLibraryUpload />}
//       </div>
//     </div>
//   );
// }
