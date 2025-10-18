"use client";

import { useState, useCallback, useMemo, ReactElement } from "react";
import { Button, Tooltip } from "@/components/UI";
import {
  LuFileText,
  LuFile,
  LuSheet,
  LuPresentation,
  LuArchive,
  LuVideo,
  LuMusic,
  LuImage,
  LuDownload,
} from "react-icons/lu";

interface DownloadButtonProps {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  onDownload?: (fileId: string) => Promise<void> | void;
  variant?: "primary" | "outline" | "secondary";
  showLabel?: boolean;
  showFileType?: boolean;
  trackDownload?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

export default function DownloadButton({
  fileId,
  fileName,
  fileUrl,
  onDownload,
  variant = "outline",
  showLabel = true,
  showFileType = true,
  trackDownload = false,
  className = "",
  onError,
  disabled = false,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  // File extension to icon mapping
  const fileTypeMap = useMemo(
    () => ({
      pdf: <LuFileText className="w-5 h-5" />,
      doc: <LuFile className="w-5 h-5" />,
      docx: <LuFile className="w-5 h-5" />,
      xls: <LuSheet className="w-5 h-5" />,
      xlsx: <LuSheet className="w-5 h-5" />,
      ppt: <LuPresentation className="w-5 h-5" />,
      pptx: <LuPresentation className="w-5 h-5" />,
      zip: <LuArchive className="w-5 h-5" />,
      rar: <LuArchive className="w-5 h-5" />,
      "7z": <LuArchive className="w-5 h-5" />,
      mp4: <LuVideo className="w-5 h-5" />,
      avi: <LuVideo className="w-5 h-5" />,
      mov: <LuVideo className="w-5 h-5" />,
      mp3: <LuMusic className="w-5 h-5" />,
      wav: <LuMusic className="w-5 h-5" />,
      jpg: <LuImage className="w-5 h-5" />,
      jpeg: <LuImage className="w-5 h-5" />,
      png: <LuImage className="w-5 h-5" />,
      gif: <LuImage className="w-5 h-5" />,
    }),
    []
  );

  const getFileExtension = useCallback(() => {
    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  }, [fileName]);

  const getFileIcon = useCallback((): ReactElement => {
    const extension = getFileExtension().toLowerCase();
    return (
      fileTypeMap[extension as keyof typeof fileTypeMap] || (
        <LuDownload className="w-5 h-5" />
      )
    );
  }, [getFileExtension, fileTypeMap]);

  const handleDownload = useCallback(async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      // Call the onDownload callback if provided
      if (onDownload) {
        await Promise.resolve(onDownload(fileId));
      }

      // If we have a direct file URL, trigger download
      if (fileUrl) {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);

        try {
          link.click();
        } finally {
          document.body.removeChild(link);
        }
      }

      // Track download if enabled
      if (trackDownload) {
        setDownloadCount((prev) => prev + 1);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Download failed:", err);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    disabled,
    onDownload,
    fileId,
    fileUrl,
    fileName,
    trackDownload,
    onError,
  ]);

  const labelText = useMemo(() => {
    if (!showLabel) return undefined;
    if (loading) return "Downloading...";
    return `Download${showFileType ? ` (${getFileExtension()})` : ""}`;
  }, [showLabel, loading, showFileType, getFileExtension]);

  const tooltipText = useMemo(() => {
    return `Download ${fileName}${
      downloadCount > 0
        ? ` • ${downloadCount} ${
            downloadCount === 1 ? "download" : "downloads"
          }`
        : ""
    }`;
  }, [fileName, downloadCount]);

  return (
    <Tooltip text={tooltipText} position="top">
      <Button
        variant={variant}
        loading={loading}
        onClick={handleDownload}
        icon={getFileIcon()}
        label={labelText}
        className={className}
        disabled={disabled || loading}
        aria-label={`Download ${fileName}`}
      />
    </Tooltip>
  );
}


// Usage Exampless:

// "use client";

// import DownloadButton from "@/components/DownloadButton";
// import { Card, Button } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Basic Course Materials Download
// export function CourseDownload() {
//   const courseMaterials = [
//     {
//       id: "mat-1",
//       fileName: "React_Fundamentals_Slides.pdf",
//       fileUrl: "/downloads/react-slides.pdf",
//     },
//     {
//       id: "mat-2",
//       fileName: "Code_Examples.zip",
//       fileUrl: "/downloads/code-examples.zip",
//     },
//     {
//       id: "mat-3",
//       fileName: "Course_Outline.docx",
//       fileUrl: "/downloads/course-outline.docx",
//     },
//   ];

//   return (
//     <div className="p-6 space-y-4">
//       <h2 className="text-2xl font-bold text-black mb-6">Course Materials</h2>

//       <div className="space-y-3">
//         {courseMaterials.map((material) => (
//           <Card
//             key={material.id}
//             variant="outlined"
//             className="flex items-center justify-between p-4"
//           >
//             <div>
//               <p className="font-medium text-black">{material.fileName}</p>
//               <p className="text-sm text-gray-600">Download course material</p>
//             </div>
//             <DownloadButton
//               fileId={material.id}
//               fileName={material.fileName}
//               fileUrl={material.fileUrl}
//               variant="primary"
//               showFileType={true}
//             />
//           </Card>
//         ))}
//       </div>
//     </div>
//   );
// }

// // Example 2: Download with Tracking
// export function TrackedDownloads() {
//   const handleDownload = async (fileId: string) => {
//     try {
//       await fetch("/api/downloads/track", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ fileId }),
//       });
//     } catch (error) {
//       console.error("Failed to track download:", error);
//     }
//   };

//   return (
//     <div className="p-6 space-y-4">
//       <h2 className="text-2xl font-bold text-black mb-6">
//         Assignment Resources
//       </h2>

//       <Card variant="elevated">
//         <h3 className="text-lg font-semibold text-black mb-4">
//           Assignment Template Files
//         </h3>

//         <div className="space-y-3">
//           <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
//             <div>
//               <p className="font-medium text-black">assignment-template.xlsx</p>
//               <p className="text-sm text-gray-600">
//                 Excel spreadsheet template
//               </p>
//             </div>
//             <DownloadButton
//               fileId="assign-1"
//               fileName="assignment-template.xlsx"
//               fileUrl="/downloads/template.xlsx"
//               onDownload={handleDownload}
//               trackDownload={true}
//               showFileType={true}
//             />
//           </div>

//           <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
//             <div>
//               <p className="font-medium text-black">submission-guide.pdf</p>
//               <p className="text-sm text-gray-600">Guidelines for submission</p>
//             </div>
//             <DownloadButton
//               fileId="assign-2"
//               fileName="submission-guide.pdf"
//               fileUrl="/downloads/guide.pdf"
//               onDownload={handleDownload}
//               trackDownload={true}
//               variant="outline"
//             />
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 3: Lesson Resources with Multiple File Types
// export function LessonResources() {
//   const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(
//     new Set()
//   );

//   const handleDownload = async (fileId: string) => {
//     setDownloadedFiles((prev) => new Set([...prev, fileId]));
//   };

//   const resources = [
//     { id: "r1", name: "Lecture Notes", file: "lecture-notes.pdf" },
//     { id: "r2", name: "Code Files", file: "code-examples.zip" },
//     { id: "r3", name: "Workbook", file: "workbook.xlsx" },
//     { id: "r4", name: "Presentation", file: "presentation.pptx" },
//   ];

//   return (
//     <div className="p-6">
//       <Card
//         variant="elevated"
//         header={<h3 className="text-lg font-semibold">Lesson Resources</h3>}
//       >
//         <div className="space-y-3">
//           {resources.map((resource) => (
//             <div
//               key={resource.id}
//               className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
//             >
//               <div className="flex-1">
//                 <p className="font-medium text-black">{resource.name}</p>
//                 <p className="text-xs text-gray-500">{resource.file}</p>
//               </div>
//               <DownloadButton
//                 fileId={resource.id}
//                 fileName={resource.file}
//                 fileUrl={`/downloads/${resource.file}`}
//                 onDownload={handleDownload}
//                 showLabel={true}
//                 showFileType={true}
//                 variant={
//                   downloadedFiles.has(resource.id) ? "secondary" : "outline"
//                 }
//               />
//             </div>
//           ))}
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 4: Bulk Downloads
// export function BulkDownloads() {
//   const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

//   const handleToggleFile = (fileId: string) => {
//     const newSelected = new Set(selectedFiles);
//     if (newSelected.has(fileId)) {
//       newSelected.delete(fileId);
//     } else {
//       newSelected.add(fileId);
//     }
//     setSelectedFiles(newSelected);
//   };

//   const handleBulkDownload = async () => {
//     console.log("Downloading files:", Array.from(selectedFiles));
//   };

//   const files = [
//     { id: "f1", name: "Module_1_Complete.zip", size: "245 MB" },
//     { id: "f2", name: "Module_2_Complete.zip", size: "312 MB" },
//     { id: "f3", name: "Resources.pdf", size: "45 MB" },
//     { id: "f4", name: "Certificate_Template.pptx", size: "8 MB" },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black">
//         Download Course Materials
//       </h2>

//       <Card variant="elevated">
//         <div className="space-y-3">
//           {files.map((file) => (
//             <div
//               key={file.id}
//               className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg"
//             >
//               <input
//                 type="checkbox"
//                 id={file.id}
//                 checked={selectedFiles.has(file.id)}
//                 onChange={() => handleToggleFile(file.id)}
//                 className="w-5 h-5 cursor-pointer"
//               />
//               <div className="flex-1">
//                 <label
//                   htmlFor={file.id}
//                   className="font-medium text-black cursor-pointer"
//                 >
//                   {file.name}
//                 </label>
//                 <p className="text-xs text-gray-500">{file.size}</p>
//               </div>
//               <DownloadButton
//                 fileId={file.id}
//                 fileName={file.name}
//                 fileUrl={`/downloads/${file.name}`}
//                 showLabel={false}
//                 variant="outline"
//               />
//             </div>
//           ))}
//         </div>

//         <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
//           <p className="text-sm text-gray-700 mb-3">
//             {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""}{" "}
//             selected
//           </p>
//           <Button
//             label={`Download ${selectedFiles.size} File${
//               selectedFiles.size !== 1 ? "s" : ""
//             }`}
//             variant="primary"
//             onClick={handleBulkDownload}
//             disabled={selectedFiles.size === 0}
//             className="w-full"
//           />
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 5: Certificate Download
// export function CertificateDownload() {
//   const [certificate, setCertificate] = useState({
//     id: "cert-001",
//     fileName: "React_Fundamentals_Certificate.pdf",
//     issued: "2024-01-15",
//     score: 95,
//   });

//   const handleCertificateDownload = async (fileId: string) => {
//     console.log("Downloading certificate:", fileId);
//   };

//   const handleError = (error: Error) => {
//     console.error("Certificate download error:", error);
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <Card
//         variant="elevated"
//         className="text-center space-y-6"
//         header={
//           <div>
//             <div className="text-5xl mb-2">🏆</div>
//             <h2 className="text-2xl font-bold text-black">Course Completed!</h2>
//           </div>
//         }
//       >
//         <div className="space-y-2">
//           <p className="text-gray-600">React Fundamentals</p>
//           <p className="text-sm text-gray-500">
//             Completed on {certificate.issued}
//           </p>
//           <p className="text-lg font-semibold text-indigo-600">
//             Score: {certificate.score}%
//           </p>
//         </div>

//         <div className="flex gap-3 justify-center">
//           <DownloadButton
//             fileId={certificate.id}
//             fileName={certificate.fileName}
//             fileUrl={`/downloads/${certificate.fileName}`}
//             onDownload={handleCertificateDownload}
//             onError={handleError}
//             variant="primary"
//             showFileType={true}
//           />
//           <Button
//             label="Share Certificate"
//             variant="outline"
//             className="px-6"
//           />
//         </div>
//       </Card>
//     </div>
//   );
// }

// // Example 6: Complete Dashboard
// export default function DownloadDashboard() {
//   const [downloads, setDownloads] = useState<Record<string, number>>({});

//   const handleDownload = async (fileId: string) => {
//     setDownloads((prev) => ({
//       ...prev,
//       [fileId]: (prev[fileId] || 0) + 1,
//     }));
//     console.log(`File ${fileId} downloaded`);
//   };

//   const handleError = (fileId: string, error: Error) => {
//     console.error(`Download error for ${fileId}:`, error);
//   };

//   const courseMaterials = [
//     { id: "slides", fileName: "course-slides.pdf", type: "Lecture Slides" },
//     { id: "code", fileName: "source-code.zip", type: "Source Code" },
//     { id: "workbook", fileName: "workbook.xlsx", type: "Workbook" },
//   ];

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="mb-8 border-b border-gray-200 pb-6">
//           <h1 className="text-4xl font-bold text-black mb-2">
//             Course Resources
//           </h1>
//           <p className="text-gray-600">
//             Download all materials for React Fundamentals
//           </p>
//         </div>

//         {/* Course Materials Section */}
//         <div className="mb-12">
//           <h2 className="text-2xl font-bold text-black mb-6">Materials</h2>
//           <div className="space-y-3">
//             {courseMaterials.map((material) => (
//               <Card
//                 key={material.id}
//                 variant="outlined"
//                 hoverable
//                 className="p-4 flex items-center justify-between"
//               >
//                 <div>
//                   <p className="font-medium text-black">{material.type}</p>
//                   <p className="text-xs text-gray-500">{material.fileName}</p>
//                   {downloads[material.id] && (
//                     <p className="text-xs text-green-600 mt-1">
//                       ✓ Downloaded {downloads[material.id]} time
//                       {downloads[material.id] !== 1 ? "s" : ""}
//                     </p>
//                   )}
//                 </div>
//                 <DownloadButton
//                   fileId={material.id}
//                   fileName={material.fileName}
//                   fileUrl={`/downloads/${material.fileName}`}
//                   onDownload={() => handleDownload(material.id)}
//                   onError={(error) => handleError(material.id, error)}
//                   variant="primary"
//                   showFileType={true}
//                 />
//               </Card>
//             ))}
//           </div>
//         </div>

//         {/* Additional Resources */}
//         <div>
//           <h2 className="text-2xl font-bold text-black mb-6">Certificates</h2>
//           <Card variant="elevated" className="text-center p-8">
//             <div className="text-4xl mb-3">📜</div>
//             <h3 className="text-lg font-semibold text-black mb-2">
//               Course Completion Certificate
//             </h3>
//             <p className="text-gray-600 mb-6">
//               Download your certificate of completion
//             </p>
//             <DownloadButton
//               fileId="cert"
//               fileName="React_Fundamentals_Certificate.pdf"
//               fileUrl="/downloads/certificate.pdf"
//               onDownload={() => handleDownload("cert")}
//               variant="primary"
//             />
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }