import { useState, useRef, ChangeEvent, DragEvent, ReactElement } from "react";
import { Card, Button, Input, Textarea, Select, Alert } from "@/components/UI";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  url?: string;
}

interface UploadFormProps {
  onUpload: (files: UploadedFile[], formData: Record<string, any>) => void;
  accept?: string;
  maxSize?: number; // in MB
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
    isPublic: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFile = (file: File): string | null => {
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
        return `File type not allowed. Accepted types: ${accept}`;
      }
    }

    return null;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles: UploadedFile[] = [];

    newFiles.slice(0, maxFiles - files.length).forEach((file) => {
      const error = validateFile(file);

      if (error) {
        // Show error for this file
        const errorFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          progress: 0,
          status: "error",
          error,
        };
        validFiles.push(errorFile);
      } else {
        const uploadFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          progress: 0,
          status: "uploading",
        };
        validFiles.push(uploadFile);
      }
    });

    setFiles((prev) => [...prev, ...validFiles]);

    // Simulate upload progress for valid files
    validFiles.forEach((file) => {
      if (file.status === "uploading") {
        simulateUpload(file.id);
      }
    });
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

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
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      return;
    }

    const completedFiles = files.filter((f) => f.status === "completed");
    if (completedFiles.length === 0) {
      return;
    }

    onUpload(completedFiles, formData);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const canSubmit =
    files.some((f) => f.status === "completed") && formData.title;

  return (
    <Card variant="elevated" className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* File Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
            ${
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-300 hover:border-gray-400"
            }
            ${files.length > 0 ? "hidden" : ""}
          `}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drag and drop your files here
          </p>
          <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
          <Button
            variant="outline"
            label="Browse Files"
            onClick={(e) => {
              e.stopPropagation();
              triggerFileInput();
            }}
          />
          <p className="text-xs text-gray-400 mt-4">
            Max file size: {maxSize}MB • Accepted: {accept}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Selected Files (
                {files.filter((f) => f.status === "completed").length}/
                {files.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                label="Add More Files"
                onClick={triggerFileInput}
              />
            </div>

            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    {file.status === "completed" ? (
                      <svg
                        className="w-6 h-6 text-green-500"
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
                    ) : file.status === "error" ? (
                      <svg
                        className="w-6 h-6 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    ) : (
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>

                    {file.status === "uploading" && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}

                    {file.error && (
                      <p className="text-sm text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>

                  <Button
                    variant="none"
                    base="off"
                    onClick={() => removeFile(file.id)}
                    icon={
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Fields */}
        {files.some((f) => f.status === "completed") && (
          <div className="space-y-4 border-t pt-6">
            <Input
              label="Title"
              placeholder="Enter a title for your upload"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />

            <Textarea
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
              label="Tags"
              placeholder="Add tags separated by commas"
              value={formData.tags}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tags: e.target.value }))
              }
              helperText="Use commas to separate multiple tags"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make this content public
              </label>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {files.some((f) => f.status === "completed") && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              label="Cancel"
              onClick={() => setFiles([])}
            />
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
