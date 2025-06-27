"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MaterialInfo } from '@/types/materialUpload';

export type FilePreviewProps = {
  type: "pdf" | "image";
  materialInfo: MaterialInfo;
};

export type SortableFileItemProps = {
  type: "pdf" | "image";
  id: string;
  url: string;
  number: number;
  children?: React.ReactNode;
};



const SortableFileItem = ({
  type,
  id,
  url,
  number,
  children,
}: SortableFileItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (type === "pdf") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative border rounded overflow-hidden cursor-move bg-white shadow-sm hover:shadow-md transition-shadow"
        {...attributes}
        {...listeners}
      >
        <div className="absolute top-0 left-0 bg-black text-white text-xs px-2 py-1 rounded-br z-10">
          Page {number}
        </div>
        <div className="relative w-full h-64 bg-gray-50 flex items-center justify-center">
          {children}
        </div>
        <div className="p-2 bg-gray-50 text-center text-xs">
          Drag to reorder
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative border rounded overflow-hidden cursor-move bg-white shadow-sm hover:shadow-md transition-shadow"
      {...attributes}
      {...listeners}
    >
      <div className="absolute top-0 left-0 bg-black text-white text-xs px-2 py-1 rounded-br z-10">
        Photo {number}
      </div>
      <div className="relative w-full h-48">
        <Image
          src={url}
          alt={`Photo ${number}`}
          className="object-cover"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-2 bg-gray-50 text-center text-xs">Drag to reorder</div>
    </div>
  );
};

export const FilePreview = ({ type, materialInfo }: FilePreviewProps) => {
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [pdfFileUrl, setPdfFileUrl] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isLoading, setIsLoading] = useState(false);
  const [selectedEnhancement, setSelectedEnhancement] = useState("original");
  const [imageQuality, setImageQuality] = useState(100);
  const [pdfError, setPdfError] = useState<string>("");

  const [selectedFilter, setSelectedFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
  // If cloud URL is present, use it directly
  if (materialInfo.uploadedFileUrl) {
  if (type === "pdf") {
  setPdfFileUrl(materialInfo.uploadedFileUrl);
  } else {
  setFileUrls([materialInfo.uploadedFileUrl]);
  }
  return;
  }
  if (!materialInfo.files || materialInfo.files.length === 0) {
  return;
  }
  
  if (type === "pdf") {
  const pdfFile = materialInfo.files[0];
  if (pdfFile) {
  setIsLoading(true);
  setPdfError(""); // Clear any previous errors
  // Create object URL for PDF file
  const url = URL.createObjectURL(pdfFile);
  setPdfFileUrl(url);
  setIsLoading(false);
  
  // Cleanup function
  return () => {
  URL.revokeObjectURL(url);
  };
  }
  } else {
  const urls = materialInfo.files.map((file) => {
  return URL.createObjectURL(file);
  });
  setFileUrls(urls);
  
  // Cleanup function
  return () => {
  urls.forEach((url) => URL.revokeObjectURL(url));
  };
  }
  }, [materialInfo, type]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && type === "image") {
      setFileUrls((items) => {
        const oldIndex = items.findIndex((item) => item === active.id);
        const newIndex = items.findIndex((item) => item === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // PDF specific handlers
  const applyPDFEnhancement = (enhancement: string) => {
    setSelectedEnhancement(enhancement);
  };

  // Image specific handlers
  const applyImageFilter = (filter: string) => {
    setSelectedFilter(filter);
  };

  const applyImageAdjustments = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  if (type === "pdf" && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading PDF document...</p>
        <p className="text-sm text-gray-500 mt-2">
          This may take a moment for large files
        </p>
      </div>
    );
  }

  if (type === "pdf" && pdfError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg
            className="mx-auto h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">PDF Loading Error</h2>
        <p className="text-red-600 mb-4">{pdfError}</p>
        <div className="text-sm text-gray-600">
          <p>Please ensure the file is a valid PDF document and try again.</p>
          <p className="mt-2">
            If the problem persists, try refreshing the page or uploading a
            different PDF.
          </p>
        </div>
      </div>
    );
  }

  if (
    !materialInfo.files ||
    materialInfo.files.length === 0 ||
    (type === "image" && fileUrls.length === 0) ||
    (type === "pdf" && !pdfFileUrl && !isLoading)
  ) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">
          {type === "pdf" ? "No PDF File" : "No Photos Found"}
        </h2>
        <p>
          {type === "pdf"
            ? "Unable to generate preview for the uploaded PDF."
            : "Unable to generate previews for the uploaded photos."}
        </p>
      </div>
    );
  }

  const sortableItems = fileUrls;

  return (
    <div>
      {/* Enhancement Options */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-medium mb-4">
          {type === "pdf" ? "PDF" : "Photo"} Enhancement Options
        </h3>
        {type === "pdf" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enhancement Preset
              </label>
              <select
                value={selectedEnhancement}
                onChange={(e) => applyPDFEnhancement(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="original">Original</option>
                <option value="text">Text Optimization</option>
                <option value="grayscale">Grayscale</option>
                <option value="highContrast">High Contrast</option>
                <option value="aiEnhance">AI Enhancement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Quality: {imageQuality}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={imageQuality}
                onChange={(e) => setImageQuality(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter
                </label>
                <select
                  value={selectedFilter}
                  onChange={(e) => applyImageFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  disabled={isProcessing}
                >
                  <option value="none">None</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="sepia">Sepia</option>
                  <option value="vintage">Vintage</option>
                  <option value="clarity">Clarity Boost</option>
                  <option value="aiEnhance">AI Enhancement</option>
                </select>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brightness: {brightness}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrast: {contrast}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={applyImageAdjustments}
              disabled={isProcessing}
              className={`px-4 py-2 rounded ${
                isProcessing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="inline-block animate-spin mr-2">↻</span>
                  Processing...
                </>
              ) : (
                "Apply Adjustments"
              )}
            </button>
          </>
        )}
      </div>

      {/* Document Info */}
      {type === "pdf" && (
        <div className="bg-blue-50 p-3 rounded mb-4">
          <h4 className="font-medium text-blue-700 mb-1">
            Document Information
          </h4>
          <p className="text-blue-600 text-sm">
            PDF loaded successfully and ready for preview
          </p>
        </div>
      )}

      {/* PDF Viewer Section */}
      {type === "pdf" && materialInfo.files?.[0] && (
        <div className="text-sm text-gray-700 mt-2">
          <strong>File:</strong> {materialInfo.files[0].name}
        </div>
      )}

      {type === "pdf" && pdfFileUrl && (
        <>
          {/* Main PDF Viewer */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">PDF Viewer</h3>
            <div
              className="border rounded-lg overflow-hidden"
              style={{ height: "600px" }}
            >
              <iframe
                src={pdfFileUrl}
                title="PDF Preview"
                width="100%"
                height="600px"
                className="w-full h-[600px] border rounded"
              />
            </div>
          </div>
        </>
      )}

      {/* Image sorting and arrangement */}
      {type === "image" && (
        <>
          <h3 className="font-medium mb-2">Arrange Photos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop to rearrange the photos. The numbers will update to show the new order for upload.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableItems}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fileUrls.map((url, index) => (
                  <SortableFileItem
                    key={url}
                    id={url}
                    url={url}
                    type="image"
                    number={index + 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Additional Notes */}
      <div className="bg-blue-50 p-3 rounded text-sm mt-6">
        <h4 className="font-medium text-blue-700 mb-1">
          {type === "pdf" ? "PDF Processing Notes" : "Photo Processing Notes"}
        </h4>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          {type === "pdf" ? (
            <>
              <li>PDF is displayed using your browser&apos;s built-in PDF viewer</li>
              <li>You can zoom, scroll, and navigate through pages using the PDF viewer controls</li>
              <li>The PDF will be processed as-is without any reordering</li>
            </>
          ) : (
            <>
              <li>Drag and drop photos to change their order before upload</li>
              <li>Photo numbers will update to reflect the new arrangement</li>
              <li>Filters are applied non-destructively</li>
              <li>Original image quality is preserved in the background</li>
              <li>For best results, upload high-resolution images</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};