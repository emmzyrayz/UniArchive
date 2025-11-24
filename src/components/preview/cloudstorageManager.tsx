'use client'

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  FaSearch,
  // FaFilter,
  FaSortAmountUpAlt,
  FaSortAmountDownAlt,
  FaDownload,
  FaTrashAlt,
  // FaEye,
  FaImage,
  // FaCalendarAlt,
  // FaUpload,
} from "react-icons/fa";
import { HiXMark } from "react-icons/hi2";
import { TbFileText } from "react-icons/tb";
import { FiHardDrive } from "react-icons/fi";
import { Loading } from "../reuse/loading";

// Types for our files
interface CloudFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "document";
  provider: "cloudinary" | "backblaze";
  size: number;
  uploadDate: Date;
  mimeType: string;
  publicId?: string; // For Cloudinary
  key?: string; // For Backblaze
  format?: string;
  width?: number;
  height?: number;
}

// Raw file interface for API responses
interface RawCloudFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "document";
  provider: "cloudinary" | "backblaze";
  size: number;
  uploadDate: string | number | Date; // Can be string, number, or Date from API
  mimeType: string;
  publicId?: string;
  key?: string;
  format?: string;
  width?: number;
  height?: number;
}

// Mock data - replace with your API calls
// const mockFiles: CloudFile[] = [
//   {
//     id: "1",
//     name: "university-logo.png",
//     url: "https://res.cloudinary.com/demo/image/upload/v1640995200/university-logo.png",
//     type: "image",
//     provider: "cloudinary",
//     size: 245760,
//     uploadDate: new Date("2024-01-15T10:30:00"),
//     mimeType: "image/png",
//     publicId: "university-logos/logo_1640995200",
//     format: "png",
//     width: 800,
//     height: 600,
//   },
//   {
//     id: "2",
//     name: "course-material.pdf",
//     url: "https://mybucket.s3.eu-central-003.backblazeb2.com/materials/1640995300_abc123_course-material.pdf",
//     type: "document",
//     provider: "backblaze",
//     size: 1048576,
//     uploadDate: new Date("2024-01-14T15:45:00"),
//     mimeType: "application/pdf",
//     key: "materials/1640995300_abc123_course-material.pdf",
//   },
//   {
//     id: "3",
//     name: "student-handbook.docx",
//     url: "https://mybucket.s3.eu-central-003.backblazeb2.com/materials/1640995400_def456_student-handbook.docx",
//     type: "document",
//     provider: "backblaze",
//     size: 2097152,
//     uploadDate: new Date("2024-01-13T09:20:00"),
//     mimeType:
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     key: "materials/1640995400_def456_student-handbook.docx",
//   },
//   {
//     id: "4",
//     name: "campus-photo.jpg",
//     url: "https://res.cloudinary.com/demo/image/upload/v1640995500/campus-photo.jpg",
//     type: "image",
//     provider: "cloudinary",
//     size: 1572864,
//     uploadDate: new Date("2024-01-12T14:15:00"),
//     mimeType: "image/jpeg",
//     publicId: "university-logos/campus_1640995500",
//     format: "jpg",
//     width: 1200,
//     height: 800,
//   },
// ];

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFileIcon = (file: CloudFile) => {
  if (file.type === "image") {
    return <FaImage className="w-5 h-5 text-blue-500" />;
  }
  return <TbFileText className="w-5 h-5 text-green-500" />;
};

const getProviderBadge = (provider: string) => {
  const colors = {
    cloudinary: "bg-purple-100 text-purple-800 border-purple-200",
    backblaze: "bg-orange-100 text-orange-800 border-orange-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
        colors[provider as keyof typeof colors]
      }`}
    >
      <FiHardDrive className="w-3 h-3 mr-1" />
      {provider === "cloudinary" ? "Cloudinary" : "Backblaze B2"}
    </span>
  );
};

// File Card Component
const FileCard: React.FC<{
  file: CloudFile;
  onClick: () => void;
  onDelete: (file: CloudFile) => void;
  isSelected: boolean;
  onSelect: (fileId: string) => void;
}> = ({ file, onClick, onDelete, isSelected, onSelect }) => (
  <div
    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 hover:border-blue-300 transform hover:-translate-y-1"
  >
    <div className="p-4">
      {/* Selection checkbox */}
      <div className="flex items-center justify-between mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(file.id);
          }}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* File preview */}
      <div className="mb-3 flex items-center justify-center h-32 bg-gray-50 rounded-lg overflow-hidden">
        {file.type === "image" ? (
          <Image
            width={300}
            height={500}
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <TbFileText className="w-12 h-12 mb-2" />
            <span className="text-xs font-medium uppercase">
              {file.format || file.mimeType.split("/")[1]}
            </span>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </h3>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatFileSize(file.size)}</span>
          {getFileIcon(file)}
        </div>

        <div className="flex items-center justify-between">
          {getProviderBadge(file.provider)}
          <span className="text-xs text-gray-400">
            {formatDate(file.uploadDate)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file);
            }}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
);

// File Modal Component
const FileModal: React.FC<{
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onFileDeleted: () => void;
}> = ({ file, isOpen, onClose, onFileDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !file) return null;

  const handleDelete = async () => {
    if (isDeleting) return;

    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);

      // Construct the correct endpoint URL based on provider
      let endpoint: string;

      if (file.provider === "cloudinary") {
        // For Cloudinary, use the publicId (which should be the file.id or file.publicId)
        const publicId = file.publicId || file.id;
        endpoint = `/api/admin/upload-image/delete/${encodeURIComponent(
          publicId
        )}`;
      } else {
        // For Backblaze, use the key (which is the full file path)
        const fileKey = file.key || file.id;
        endpoint = `/api/admin/upload-file/delete/${encodeURIComponent(
          fileKey
        )}`;
      }

      console.log("Deleting file:", {
        provider: file.provider,
        endpoint,
        fileKey: file.key || file.id,
      });

      const response = await fetch(endpoint, { method: "DELETE" });

      if (response.ok) {
        console.log("File deleted successfully");
        onFileDeleted(); // Refresh the file list
        onClose();
      } else {
        const errorData = await response.json();
        console.error("Failed to delete file:", errorData);
        alert(`Failed to delete file: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Error deleting file. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/30 bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal with animations */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getFileIcon(file)}
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {file.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <HiXMark className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                {file.type === "image" ? (
                  <Image
                    width={300}
                    height={500}
                    src={file.url}
                    alt={file.name}
                    className="max-w-full max-h-[400px] object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <div className="text-center">
                    <TbFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Document preview not available
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Click download to view file
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                File Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    Provider
                  </span>
                  {getProviderBadge(file.provider)}
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    File Size
                  </span>
                  <span className="text-sm text-gray-900">
                    {formatFileSize(file.size)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    Upload Date
                  </span>
                  <span className="text-sm text-gray-900">
                    {formatDate(file.uploadDate)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    MIME Type
                  </span>
                  <span className="text-sm text-gray-900 font-mono">
                    {file.mimeType}
                  </span>
                </div>

                {file.width && file.height && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      Dimensions
                    </span>
                    <span className="text-sm text-gray-900">
                      {file.width} × {file.height}px
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    File ID
                  </span>
                  <span
                    className="text-sm text-gray-900 font-mono truncate max-w-[200px]"
                    title={file.publicId || file.key || file.id}
                  >
                    {file.publicId || file.key || file.id}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaDownload className="w-4 h-4" />
                  <span>Download File</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FaTrashAlt className="w-4 h-4" />
                  <span>{isDeleting ? "Deleting..." : "Delete File"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const CloudStorageManager: React.FC = () => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<CloudFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof CloudFile>("uploadDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<"all" | "image" | "document">(
    "all"
  );
  const [filterProvider, setFilterProvider] = useState<
    "all" | "cloudinary" | "backblaze"
  >("all");
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);

      // Fetch from both providers
      const [b2Response, cloudinaryResponse] = await Promise.all([
        fetch("/api/admin/upload-file/view"),
        fetch("/api/admin/upload-image/view"),
      ]);

      const b2Data = await b2Response.json();
      const cloudinaryData = await cloudinaryResponse.json();

      // Process files to ensure uploadDate is a Date object with proper type safety
      const processFiles = (files: RawCloudFile[]): CloudFile[] =>
        files.map((file: RawCloudFile) => ({
          ...file,
          uploadDate: file.uploadDate
            ? file.uploadDate instanceof Date
              ? file.uploadDate
              : new Date(file.uploadDate)
            : new Date(), // Fallback to current date if undefined
        }));

      const allFiles = [
        ...(b2Data.success ? processFiles(b2Data.data.files || []) : []),
        ...(cloudinaryData.success
          ? processFiles(cloudinaryData.data.files || [])
          : []),
      ];

      setFiles(allFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Filter and search effect
  useEffect(() => {
    let filtered = files;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((file) => file.type === filterType);
    }

    // Apply provider filter
    if (filterProvider !== "all") {
      filtered = filtered.filter((file) => file.provider === filterProvider);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "uploadDate") {
        // Convert to Date objects if they're strings, then get time
        const aDate = aValue instanceof Date ? aValue : new Date(aValue as string | number);
        const bDate =
          bValue instanceof Date ? bValue : new Date(bValue as string | number);
        aValue = aDate.getTime();
        bValue = bDate.getTime();
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    setFilteredFiles(filtered);
  }, [files, searchTerm, filterType, filterProvider, sortField, sortDirection]);

  const openModal = (file: CloudFile) => {
    setSelectedFile(file);
    setIsModalOpen(true);
    document.body.style.overflow = "hidden"; // Disable scrolling
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    document.body.style.overflow = "unset"; // Re-enable scrolling
  };

  const handleFileDeleted = () => {
    fetchFiles(); // Refresh the file list
    setSelectedFiles(new Set()); // Clear selections
  };

  const handleSingleDelete = async (file: CloudFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      let endpoint: string;

      if (file.provider === "cloudinary") {
        const publicId = file.publicId || file.id;
        endpoint = `/api/admin/upload-image/delete/${encodeURIComponent(
          publicId
        )}`;
      } else {
        const fileKey = file.key || file.id;
        endpoint = `/api/admin/upload-file/delete/${encodeURIComponent(
          fileKey
        )}`;
      }

      const response = await fetch(endpoint, { method: "DELETE" });

      if (response.ok) {
        console.log("File deleted successfully");
        handleFileDeleted();
      } else {
        const errorData = await response.json();
        console.error("Failed to delete file:", errorData);
        alert(`Failed to delete file: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Error deleting file. Please try again.");
    }
  };

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((file) => file.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) {
      alert("Please select files to delete");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedFiles.size} selected files?`
      )
    ) {
      return;
    }

    setIsDeletingAll(true);

    try {
      // Group files by provider
      const selectedFilesData = filteredFiles.filter((file) =>
        selectedFiles.has(file.id)
      );

      const cloudinaryFiles = selectedFilesData.filter(
        (file) => file.provider === "cloudinary"
      );
      const backblazeFiles = selectedFilesData.filter(
        (file) => file.provider === "backblaze"
      );

      const deletePromises = [];

      // Delete Cloudinary files
      if (cloudinaryFiles.length > 0) {
        const cloudinaryIds = cloudinaryFiles.map(
          (file) => file.publicId || file.id
        );
        deletePromises.push(
          fetch("/api/admin/upload-image/delete-all", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicIds: cloudinaryIds }),
          })
        );
      }

      // Delete Backblaze files
      if (backblazeFiles.length > 0) {
        const backblazeKeys = backblazeFiles.map((file) => file.key || file.id);
        deletePromises.push(
          fetch("/api/admin/upload-file/delete-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileIds: backblazeKeys }),
          })
        );
      }

      const results = await Promise.all(deletePromises);
      let allSuccessful = true;

      for (const response of results) {
        if (!response.ok) {
          allSuccessful = false;
          const errorData = await response.json();
          console.error("Failed to delete some files:", errorData);
        }
      }

      if (allSuccessful) {
        alert("All selected files deleted successfully!");
      } else {
        alert("Some files could not be deleted. Check console for details.");
      }

      handleFileDeleted();
    } catch (error) {
      console.error("Error deleting selected files:", error);
      alert("Error deleting files. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (loading) {
      return <Loading />;
    }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cloud Storage Manager
        </h1>
        <p className="text-gray-600">
          Manage your files across Backblaze B2 and Cloudinary
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as "all" | "image" | "document")
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
          </select>

          {/* Provider Filter */}
          <select
            value={filterProvider}
            onChange={(e) =>
              setFilterProvider(
                e.target.value as "all" | "cloudinary" | "backblaze"
              )
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Providers</option>
            <option value="cloudinary">Cloudinary</option>
            <option value="backblaze">Backblaze B2</option>
          </select>

          {/* Sort */}
          <div className="flex space-x-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as keyof CloudFile)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="uploadDate">Date</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>
            <button
              onClick={() =>
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              {sortDirection === "asc" ? (
                <FaSortAmountUpAlt className="w-4 h-4" />
              ) : (
                <FaSortAmountDownAlt className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={
                  selectedFiles.size === filteredFiles.length &&
                  filteredFiles.length > 0
                }
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                Select all ({filteredFiles.length})
              </span>
            </label>
            {selectedFiles.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedFiles.size} files selected
              </span>
            )}
          </div>

          {selectedFiles.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeletingAll}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                isDeletingAll
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isDeletingAll
                ? "Deleting..."
                : `Delete Selected (${selectedFiles.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TbFileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredFiles.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaImage className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Images</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredFiles.filter((f) => f.type === "image").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiHardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Cloudinary</p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  filteredFiles.filter((f) => f.provider === "cloudinary")
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiHardDrive className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Backblaze B2</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredFiles.filter((f) => f.provider === "backblaze").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Grid */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <TbFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500 mb-2">No files found</p>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onClick={() => openModal(file)}
              onDelete={handleSingleDelete}
              onSelect={handleSelectFile}
              isSelected={selectedFiles.has(file.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <FileModal
        file={selectedFile}
        isOpen={isModalOpen}
        onClose={closeModal}
        onFileDeleted={handleFileDeleted}
      />
    </div>
  );
};

export default CloudStorageManager;
