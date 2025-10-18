"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  ChangeEvent,
  DragEvent,
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
  const uploadIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        return `File size must be less than ${maxSize}MB`;
      }

      if (accept !== "*") {
        const acceptedTypes = accept.split(",").map((type) => type.trim());
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
        const fileType = file.type;

        const isValid = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return type.toLowerCase() === fileExtension;
          }
          return type.toLowerCase() === fileType;
        });

        if (!isValid) {
          return `File type not allowed. Accepted: ${accept}`;
        }
      }

      return null;
    },
    [maxSize, accept]
  );

  const simulateUpload = useCallback((fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        uploadIntervalsRef.current.delete(fileId);

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
    }, 200);

    uploadIntervalsRef.current.set(fileId, interval);
  }, []);

  const handleFiles = useCallback(
    (newFiles: File[]) => {
      setUploadError(null);
      const validFiles: UploadedFile[] = [];

      if (files.length + newFiles.length > maxFiles) {
        setUploadError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      newFiles.forEach((file) => {
        const error = validateFile(file);
        const fileId = Math.random().toString(36).substring(2, 9);

        if (error) {
          validFiles.push({
            id: fileId,
            file,
            progress: 0,
            status: "error",
            error,
          });
        } else {
          validFiles.push({
            id: fileId,
            file,
            progress: 0,
            status: "uploading",
          });
        }
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

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
    },
    [handleFiles]
  );

  const removeFile = useCallback((fileId: string) => {
    const interval = uploadIntervalsRef.current.get(fileId);
    if (interval) {
      clearInterval(interval);
      uploadIntervalsRef.current.delete(fileId);
    }

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

    if (!formData.title) {
      setUploadError("Please provide a title");
      return;
    }

    setUploadError(null);
    onUpload(completedFiles, formData);
  }, [files, formData, onUpload]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canSubmit =
    files.some((f) => f.status === "completed") && formData.title;

  const completedCount = useMemo(
    () => files.filter((f) => f.status === "completed").length,
    [files]
  );

  const handleReset = useCallback(() => {
    files.forEach((f) => {
      const interval = uploadIntervalsRef.current.get(f.id);
      if (interval) {
        clearInterval(interval);
        uploadIntervalsRef.current.delete(f.id);
      }
    });

    setFiles([]);
    setFormData({
      title: "",
      description: "",
      category: "",
      tags: "",
      isPublic: false,
    });
  }, [files]);

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
        {files.length === 0 && (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer
              ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-300 hover:border-indigo-400"
              }
            `}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            role="button"
            tabIndex={0}
            aria-label="Drag and drop files or click to browse"
          >
            <LuCloudUpload
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              aria-hidden="true"
            />
            <p className="text-lg font-semibold text-black mb-2">
              Drag and drop your files here
            </p>
            <p className="text-sm text-gray-600 mb-4">
              or click to browse files
            </p>
            <Button
              variant="outline"
              label="Browse Files"
              onClick={(e) => {
                e?.stopPropagation?.();
                triggerFileInput();
              }}
            />
            <p className="text-xs text-gray-500 mt-4">
              Max file size: {maxSize}MB • Max files: {maxFiles} • Accepted:{" "}
              {accept}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              onChange={handleFileInput}
              className="hidden"
              aria-label="File input"
            />
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">
                Selected Files ({completedCount}/{files.length})
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
                <FileListItem key={file.id} file={file} onRemove={removeFile} />
              ))}
            </div>
          </div>
        )}

        {/* Form Fields */}
        {files.some((f) => f.status === "completed") && (
          <div className="space-y-4 border-t pt-6">
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
        {files.some((f) => f.status === "completed") && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" label="Cancel" onClick={handleReset} />
            <Button
              variant="primary"
              label={loading ? "Uploading..." : "Upload Files"}
              loading={loading}
              disabled={!canSubmit || loading}
              onClick={handleSubmit}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

interface FileListItemProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
}

function FileListItem({ file, onRemove }: FileListItemProps) {
  const fileSize = useMemo(
    () => (file.file.size / (1024 * 1024)).toFixed(2),
    [file.file.size]
  );

  return (
    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Status Icon */}
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        {file.status === "completed" ? (
          <LuCheck className="w-6 h-6 text-green-500" aria-hidden="true" />
        ) : file.status === "error" ? (
          <LuX className="w-6 h-6 text-red-500" aria-hidden="true" />
        ) : (
          <div
            className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <LuFile
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-black truncate">
            {file.file.name}
          </p>
        </div>
        <p className="text-sm text-gray-600 mt-1">{fileSize} MB</p>

        {/* Progress Bar */}
        {file.status === "uploading" && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${file.progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(file.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {/* Error Message */}
        {file.error && (
          <p className="text-sm text-red-600 mt-1">{file.error}</p>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(file.id)}
        className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
        aria-label={`Remove ${file.file.name}`}
      >
        <LuX className="w-5 h-5" />
      </button>
    </div>
  );
}


// Usage Examples:
// "use client";

// import UploadForm from "@/components/UploadForm";
// import { Card } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Course Materials Upload
// export function CourseMaterialsUpload() {
//   const [uploadStatus, setUploadStatus] = useState<string>("");

//   const handleUpload = async (files: any[], formData: any) => {
//     console.log("Uploading course materials:", { files, formData });
//     setUploadStatus("Upload successful!");
//     setTimeout(() => setUploadStatus(""), 3000);
//   };

//   const categories = [
//     { value: "slides", label: "Lecture Slides" },
//     { value: "video", label: "Video Lecture" },
//     { value: "assignment", label: "Assignment" },
//     { value: "resource", label: "Resource Material" },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">
//           Upload Course Materials
//         </h2>
//         <p className="text-gray-600">
//           Share educational resources with your students
//         </p>
//       </div>

//       {uploadStatus && (
//         <Card
//           variant="elevated"
//           className="p-4 bg-green-50 border border-green-200"
//         >
//           <p className="text-green-700 text-sm font-medium">{uploadStatus}</p>
//         </Card>
//       )}

//       <UploadForm
//         onUpload={handleUpload}
//         accept=".pdf,.pptx,.zip,.mp4"
//         maxSize={500}
//         maxFiles={5}
//         categories={categories}
//       />
//     </div>
//   );
// }

// // Example 2: Student Assignment Submission
// export function AssignmentSubmissionUpload() {
//   const handleSubmit = async (files: any[], formData: any) => {
//     console.log("Assignment submitted:", { files, formData });
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">
//           Submit Assignment
//         </h2>
//         <p className="text-gray-600">Upload your completed assignment files</p>
//       </div>

//       <UploadForm
//         onUpload={handleSubmit}
//         accept=".pdf,.docx,.zip,.txt,.py,.js,.jsx,.ts,.tsx"
//         maxSize={50}
//         maxFiles={3}
//       />
//     </div>
//   );
// }

// // Example 3: Image Gallery Upload
// export function ImageGalleryUpload() {
//   const [loading, setLoading] = useState(false);

//   const handleUpload = async (files: any[], formData: any) => {
//     setLoading(true);
//     try {
//       await new Promise((resolve) => setTimeout(resolve, 1500));
//       console.log("Images uploaded:", { files, formData });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">Upload Images</h2>
//         <p className="text-gray-600">Add images to your course gallery</p>
//       </div>

//       <UploadForm
//         onUpload={handleUpload}
//         accept=".jpg,.jpeg,.png,.gif,.webp"
//         maxSize={10}
//         maxFiles={20}
//         loading={loading}
//       />
//     </div>
//   );
// }

// // Example 4: Document Repository Upload
// export function DocumentRepositoryUpload() {
//   const categories = [
//     { value: "syllabus", label: "Syllabus" },
//     { value: "schedule", label: "Course Schedule" },
//     { value: "guidelines", label: "Guidelines" },
//     { value: "reading", label: "Reading List" },
//   ];

//   const handleUpload = async (files: any[], formData: any) => {
//     console.log("Document uploaded to repository:", { files, formData });
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">Course Documents</h2>
//         <p className="text-gray-600">
//           Upload and organize course documentation
//         </p>
//       </div>

//       <UploadForm
//         onUpload={handleUpload}
//         accept=".pdf,.docx,.doc,.txt"
//         maxSize={100}
//         maxFiles={10}
//         categories={categories}
//       />
//     </div>
//   );
// }

// // Example 5: Resource Library (Multiple File Types)
// export function ResourceLibraryUpload() {
//   const categories = [
//     { value: "tutorial", label: "Tutorial" },
//     { value: "template", label: "Template" },
//     { value: "tool", label: "Tool" },
//     { value: "sample", label: "Sample Code" },
//   ];

//   const handleUpload = async (files: any[], formData: any) => {
//     console.log("Resource added to library:", { files, formData });
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">
//           Add to Resource Library
//         </h2>
//         <p className="text-gray-600">
//           Contribute educational resources for the community
//         </p>
//       </div>

//       <UploadForm
//         onUpload={handleUpload}
//         accept=".pdf,.zip,.pptx,.docx,.mp4,.txt,.js,.py,.json"
//         maxSize={200}
//         maxFiles={5}
//         categories={categories}
//       />
//     </div>
//   );
// }

// // Example 6: Complete Upload Dashboard
// export default function UploadDashboard() {
//   const [uploads, setUploads] = useState<any[]>([]);

//   const courseMaterialCategories = [
//     { value: "slides", label: "Lecture Slides" },
//     { value: "video", label: "Video" },
//     { value: "resource", label: "Resource" },
//     { value: "assignment", label: "Assignment" },
//   ];

//   const handleCourseUpload = async (files: any[], formData: any) => {
//     const newUpload = {
//       id: Date.now(),
//       type: "course_material",
//       title: formData.title,
//       fileCount: files.length,
//       timestamp: new Date(),
//     };
//     setUploads((prev) => [newUpload, ...prev]);
//     console.log("Course material uploaded:", { files, formData });
//   };

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="mb-12 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">Upload Center</h1>
//           <p className="text-gray-600">
//             Upload and manage your educational content
//           </p>
//         </div>

//         {/* Upload Form */}
//         <div className="mb-12">
//           <h2 className="text-2xl font-bold text-black mb-6">
//             Add Course Materials
//           </h2>
//           <UploadForm
//             onUpload={handleCourseUpload}
//             accept=".pdf,.pptx,.mp4,.zip,.docx"
//             maxSize={500}
//             maxFiles={10}
//             categories={courseMaterialCategories}
//           />
//         </div>

//         {/* Recent Uploads */}
//         {uploads.length > 0 && (
//           <div className="border-t pt-8">
//             <h2 className="text-2xl font-bold text-black mb-6">
//               Recent Uploads
//             </h2>
//             <div className="space-y-3">
//               {uploads.map((upload) => (
//                 <Card
//                   key={upload.id}
//                   variant="outlined"
//                   className="p-4 flex justify-between items-center"
//                 >
//                   <div>
//                     <p className="font-semibold text-black">{upload.title}</p>
//                     <p className="text-xs text-gray-600">
//                       {upload.fileCount} file{upload.fileCount !== 1 ? "s" : ""}{" "}
//                       uploaded
//                     </p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-xs text-gray-600">
//                       {upload.timestamp.toLocaleDateString()}
//                     </p>
//                   </div>
//                 </Card>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }