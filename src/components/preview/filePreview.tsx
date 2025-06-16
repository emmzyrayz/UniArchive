"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from "pdfjs-dist";
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
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MaterialInfo } from "@/app/upload/page";

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

import "@react-pdf-viewer/core/lib/styles/index.css";

type FilePreviewProps = {
  type: "pdf" | "image";
  materialInfo: MaterialInfo;
};

type SortableFileItemProps = {
  type: "pdf" | "image";
  id: string;
  url: string;
  number: number;
  children?: React.ReactNode;
};

type PDFPageData = {
  id: string;
  pageNumber: number;
  originalIndex: number;
  thumbnail?: string;
  customThumbnail?: string; // for user-uploaded thumbnail
};

type PDFThumbnailProps = {
  pageData: PDFPageData;
  pdfDocument: PDFDocumentProxy | null;
  onThumbnailReady: (pageId: string, thumbnail: string) => void;
  onCustomThumbnail: (pageId: string, file: File) => void;
};

const PDFThumbnail = ({
  pageData,
  pdfDocument,
  onThumbnailReady,
  onCustomThumbnail,
}: PDFThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || pageData.customThumbnail) return;

    const renderThumbnail = async () => {
      try {
        setIsLoading(true);
        setError("");
        const page = await pdfDocument.getPage(pageData.pageNumber);
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d")!;
        const viewport = page.getViewport({ scale: 1 });
        const scale = 200 / viewport.width;
        const scaledViewport = page.getViewport({ scale });
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
        const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        onThumbnailReady(pageData.id, thumbnailDataUrl);
        setIsLoading(false);
      } catch {
        setError("Failed to render page " + pageData.pageNumber);
        setIsLoading(false);
      }
    };
    renderThumbnail();
  }, [pdfDocument, pageData, onThumbnailReady]);

  const handleCustomThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCustomThumbnail(pageData.id, e.target.files[0]);
    }
  };

  if (pageData.customThumbnail) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Image
          src={pageData.customThumbnail}
          alt="Custom Thumbnail"
          width={200}
          height={250}
          style={{ objectFit: "contain", maxHeight: "250px" }}
        />
        <label className="mt-2 text-xs text-blue-600 cursor-pointer underline">
          Change Thumbnail
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomThumbnail}
          />
        </label>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-xs text-gray-500">
            Loading page {pageData.pageNumber}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 text-red-500 mb-2"
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
          <p className="text-xs text-red-600">{error}</p>
          <label className="mt-2 text-xs text-blue-600 cursor-pointer underline">
            Use Custom Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCustomThumbnail}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto"
      style={{ maxHeight: "250px" }}
    />
  );
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
  const [pdfPages, setPdfPages] = useState<PDFPageData[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
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
  const [thumbnailsLoaded, setThumbnailsLoaded] = useState<Set<string>>(
    new Set()
  );

  const [selectedFilter, setSelectedFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);

  const memoizedPdfFile = useMemo(() => {
    if (type === "pdf" && materialInfo.files && materialInfo.files.length > 0) {
      return materialInfo.files[0];
    }
    return null;
  }, [type, materialInfo.files]);

  // Handle thumbnail ready callback
  const handleThumbnailReady = useCallback(
    (pageId: string, thumbnail: string) => {
      setPdfPages((prev) =>
        prev.map((page) => (page.id === pageId ? { ...page, thumbnail } : page))
      );
      setThumbnailsLoaded((prev) => new Set(prev).add(pageId));
    },
    []
  );

  // Handle custom thumbnail upload
  const handleCustomThumbnail = useCallback((pageId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPdfPages((prev) =>
          prev.map((page) =>
            page.id === pageId
              ? { ...page, customThumbnail: e.target!.result as string }
              : page
          )
        );
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Load PDF document
  const loadPdfDocument = useCallback(async (file: File) => {
    try {
      setIsLoading(true);
      setPdfError("");
      setPdfDocument(null);
      setThumbnailsLoaded(new Set());
      const fileUrl = URL.createObjectURL(file);
      setPdfFileUrl(fileUrl);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await getDocument({ data: arrayBuffer }).promise;
      setPdfDocument(pdfDoc);
      setNumPages(pdfDoc.numPages);
      const pages: PDFPageData[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        pages.push({
          id: `page-${i}`,
          pageNumber: i,
          originalIndex: i - 1,
        });
      }
      setPdfPages(pages);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setPdfError(
        `Failed to load PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, []);

  useEffect(() => {
    if (!materialInfo.files || materialInfo.files.length === 0) {
      return;
    }
    if (type === "pdf") {
      if (memoizedPdfFile) {
        loadPdfDocument(memoizedPdfFile);
      }
    } else {
      const urls = materialInfo.files.map((file) => URL.createObjectURL(file));
      setFileUrls(urls);
      return () => {
        urls.forEach((url) => URL.revokeObjectURL(url));
      };
    }
  }, [materialInfo, type, memoizedPdfFile, loadPdfDocument]);

  useEffect(() => {
    return () => {
      if (type === "image") {
        fileUrls.forEach((url) => URL.revokeObjectURL(url));
      } else if (pdfFileUrl) {
        URL.revokeObjectURL(pdfFileUrl);
      }
    };
  }, [fileUrls, pdfFileUrl, type]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      if (type === "pdf") {
        setPdfPages((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over?.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      } else {
        setFileUrls((items) => {
          const oldIndex = items.findIndex((item) => item === active.id);
          const newIndex = items.findIndex((item) => item === over?.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
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

  // Custom PDF Viewer rendering pages in pdfPages order
  const PDFPagesViewer = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageCanvases, setPageCanvases] = useState<{ [id: string]: string }>(
      {}
    );

    useEffect(() => {
      if (!pdfDocument) return;
      let isMounted = true;
      const renderPages = async () => {
        const canvases: { [id: string]: string } = {};
        for (const pageData of pdfPages) {
          try {
            const page = await pdfDocument.getPage(pageData.pageNumber);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d")!;
            await page.render({ canvasContext: context, viewport }).promise;
            canvases[pageData.id] = canvas.toDataURL("image/png");
          } catch {
            canvases[pageData.id] = "";
          }
        }
        if (isMounted) setPageCanvases(canvases);
      };
      renderPages();
      return () => {
        isMounted = false;
      };
    }, []);

    return (
      <div ref={containerRef} className="flex flex-col items-center gap-6 py-4">
        {pdfPages.map((page, idx) => (
          <div
            key={page.id}
            className="border rounded shadow bg-white p-2 w-full flex flex-col items-center"
          >
            <div className="mb-2 text-xs text-gray-500">Page {idx + 1}</div>
            {pageCanvases[page.id] ? (
              <Image
                src={pageCanvases[page.id]}
                width={300}
                height={500}
                alt={`Page ${idx + 1}`}
                style={{ maxWidth: "100%", maxHeight: "600px" }}
              />
            ) : (
              <div className="text-red-500">Failed to render page</div>
            )}
          </div>
        ))}
      </div>
    );
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
    (type === "pdf" && pdfPages.length === 0 && !isLoading)
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

  const sortableItems = type === "pdf" ? pdfPages.map((p) => p.id) : fileUrls;

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
      {type === "pdf" && numPages > 0 && (
        <div className="bg-blue-50 p-3 rounded mb-4">
          <h4 className="font-medium text-blue-700 mb-1">
            Document Information
          </h4>
          <p className="text-blue-600 text-sm">
            PDF loaded successfully with {numPages} page
            {numPages !== 1 ? "s" : ""}
          </p>
          <p className="text-blue-500 text-xs mt-1">
            Thumbnails loaded: {thumbnailsLoaded.size} of {numPages}
          </p>
        </div>
      )}

      {/* Custom PDF Viewer Section */}
      {type === "pdf" && pdfDocument && pdfPages.length > 0 && !isLoading && (
        <div className="mb-6">
          <h3 className="font-medium mb-2">PDF Viewer (Arranged Order)</h3>
          <div
            className="border rounded-lg overflow-auto"
            style={{ maxHeight: "600px" }}
          >
            <PDFPagesViewer />
          </div>
        </div>
      )}

      {/* Sortable Area */}
      <h3 className="font-medium mb-2">
        {type === "pdf" ? "Arrange Pages" : "Arrange Photos"}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Drag and drop to rearrange the {type === "pdf" ? "pages" : "photos"}.
      </p>

      {/* PDF Thumbnails */}
      {type === "pdf" && pdfDocument && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableItems}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pdfPages.map((page, index) => (
                <SortableFileItem
                  key={page.id}
                  id={page.id}
                  url=""
                  type="pdf"
                  number={index + 1}
                >
                  <PDFThumbnail
                    pageData={page}
                    pdfDocument={pdfDocument}
                    onThumbnailReady={handleThumbnailReady}
                    onCustomThumbnail={handleCustomThumbnail}
                  />
                </SortableFileItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Image sorting */}
      {type === "image" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
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
      )}

      {/* Additional Notes */}
      <div className="bg-blue-50 p-3 rounded text-sm mt-6">
        <h4 className="font-medium text-blue-700 mb-1">
          {type === "pdf" ? "PDF Processing Notes" : "Photo Processing Notes"}
        </h4>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          {type === "pdf" ? (
            <>
              <li>PDF pages are rendered in the arranged order above</li>
              <li>Custom thumbnails can be set for any page</li>
              <li>Pages load progressively for better user experience</li>
            </>
          ) : (
            <>
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
