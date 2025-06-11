'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Document, Page, pdfjs } from 'react-pdf';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MaterialInfo } from '@/app/upload/page';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

type FilePreviewProps = {
  type: 'pdf' | 'image';
  materialInfo: MaterialInfo;
};

type SortableFileItemProps = {
  type: 'pdf' | 'image';
  id: string;
  url: string;
  number: number;
  pageNumber?: number;
  pdfFile?: File;
};

type PDFPageData = {
  id: string;
  pageNumber: number;
  thumbnailUrl: string;
  pdfFile: File;
};

const SortableFileItem = ({ type, id, url, number, pageNumber, pdfFile }: SortableFileItemProps) => {
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

  if (type === 'pdf' && pageNumber && pdfFile) {
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
          <Document file={pdfFile} loading={<div className="text-xs">Loading...</div>}>
            <Page 
              pageNumber={pageNumber}
              width={200}
              loading={<div className="text-xs">Loading page...</div>}
              error={<div className="text-xs text-red-500">Error loading page</div>}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="pdf-page-thumbnail"
            />
          </Document>
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
      <div className="p-2 bg-gray-50 text-center text-xs">
        Drag to reorder
      </div>
    </div>
  );
};

export const FilePreview = ({ type, materialInfo }: FilePreviewProps) => {
  // Common state
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [pdfPages, setPdfPages] = useState<PDFPageData[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // PDF specific state
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEnhancement, setSelectedEnhancement] = useState('original');
  const [imageQuality, setImageQuality] = useState(100);
  const [pdfError, setPdfError] = useState<string>('');

  // Image specific state
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);

  // PDF document load success handler
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setPdfError('');
    
    // Generate page data for sortable context
    const pages: PDFPageData[] = [];
    for (let i = 1; i <= numPages; i++) {
      pages.push({
        id: `page-${i}`,
        pageNumber: i,
        thumbnailUrl: '', // We'll use the PDF component directly
        pdfFile: materialInfo.files![0] // Assuming single PDF file
      });
    }
    setPdfPages(pages);
  }, [materialInfo.files]);

  // PDF document load error handler
  const onDocumentLoadError = useCallback((error: Error) => {
    setIsLoading(false);
    setPdfError(`Failed to load PDF: ${error.message}`);
    console.error('PDF load error:', error);
  }, []);

  useEffect(() => {
    // Add null check for materialInfo.files
    if (!materialInfo.files || materialInfo.files.length === 0) {
      return;
    }

    if (type === 'pdf') {
      setIsLoading(true);
      setPdfError('');
      // PDF processing is handled by the Document component's onLoadSuccess
    } else {
      const urls = materialInfo.files.map(file => 
        URL.createObjectURL(file)
      );
      setFileUrls(urls);
      
      return () => {
        urls.forEach(url => URL.revokeObjectURL(url));
      };
    }
  }, [materialInfo, type]);

  // Cleanup for image URLs
  useEffect(() => {
    return () => {
      if (type === 'image') {
        fileUrls.forEach(url => URL.revokeObjectURL(url));
      }
    };
  }, [fileUrls, type]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      if (type === 'pdf') {
        setPdfPages((items) => {
          const oldIndex = items.findIndex(item => item.id === active.id);
          const newIndex = items.findIndex(item => item.id === over?.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      } else {
        setFileUrls((items) => {
          const oldIndex = items.findIndex(item => item === active.id);
          const newIndex = items.findIndex(item => item === over?.id);
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

  // Loading states
  if (type === 'pdf' && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading PDF document...</p>
      </div>
    );
  }

  // PDF Error state
  if (type === 'pdf' && pdfError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">PDF Loading Error</h2>
        <p className="text-red-600 mb-4">{pdfError}</p>
        <p className="text-sm text-gray-600">
          Please ensure the file is a valid PDF document and try again.
        </p>
      </div>
    );
  }

  // Check if files exist and have content
  if (!materialInfo.files || materialInfo.files.length === 0 || 
      (type === 'image' && fileUrls.length === 0) || 
      (type === 'pdf' && pdfPages.length === 0 && !isLoading)) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">
          {type === 'pdf' ? 'No PDF File' : 'No Photos Found'}
        </h2>
        <p>
          {type === 'pdf' 
            ? 'Unable to generate preview for the uploaded PDF.' 
            : 'Unable to generate previews for the uploaded photos.'}
        </p>
      </div>
    );
  }

  // Get items for sortable context
  const sortableItems = type === 'pdf' ? pdfPages.map(p => p.id) : fileUrls;

  return (
    <div>
      {/* Hidden PDF Document component for PDF processing */}
      {type === 'pdf' && materialInfo.files && materialInfo.files.length > 0 && (
        <div style={{ position: 'absolute', left: '-9999px' }}>
          <Document
            file={materialInfo.files[0]}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            {/* This is just for loading the document */}
          </Document>
        </div>
      )}

      {/* Enhancement Options */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-medium mb-4">
          {type === 'pdf' ? 'PDF' : 'Photo'} Enhancement Options
        </h3>
        
        {type === 'pdf' ? (
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
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="inline-block animate-spin mr-2">↻</span>
                  Processing...
                </>
              ) : (
                'Apply Adjustments'
              )}
            </button>
          </>
        )}
      </div>

      {/* Document Info */}
      {type === 'pdf' && numPages > 0 && (
        <div className="bg-blue-50 p-3 rounded mb-4">
          <h4 className="font-medium text-blue-700 mb-1">Document Information</h4>
          <p className="text-blue-600 text-sm">
            PDF loaded successfully with {numPages} page{numPages !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Sortable Area */}
      <h3 className="font-medium mb-2">
        {type === 'pdf' ? 'Arrange Pages' : 'Arrange Photos'}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Drag and drop to rearrange the {type === 'pdf' ? 'pages' : 'photos'}.
      </p>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={sortableItems} 
          strategy={type === 'pdf' ? verticalListSortingStrategy : rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {type === 'pdf' ? (
              pdfPages.map((page, index) => (
                <SortableFileItem 
                  key={page.id} 
                  id={page.id} 
                  url="" 
                  type="pdf" 
                  number={index + 1}
                  pageNumber={page.pageNumber}
                  pdfFile={page.pdfFile}
                />
              ))
            ) : (
              fileUrls.map((url, index) => (
                <SortableFileItem 
                  key={url} 
                  id={url} 
                  url={url} 
                  type="image" 
                  number={index + 1} 
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Additional Notes */}
      <div className="bg-blue-50 p-3 rounded text-sm mt-6">
        <h4 className="font-medium text-blue-700 mb-1">
          {type === 'pdf' ? 'PDF Processing Notes' : 'Photo Processing Notes'}
        </h4>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          {type === 'pdf' ? (
            <>
              <li>PDF pages are rendered as interactive thumbnails</li>
              <li>Original document quality is preserved</li>
              <li>Text and annotations are processed separately for better performance</li>
              <li>Large PDFs may take longer to load initially</li>
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