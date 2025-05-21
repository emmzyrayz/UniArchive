'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortablePDFPage } from './SortablePDFPage';
import type { MaterialInfo } from '@/app/upload/page';

type PDFPreviewProps = {
  materialInfo: MaterialInfo;
};

export default function PDFPreview({ materialInfo }: PDFPreviewProps) {
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnhancement, setSelectedEnhancement] = useState<string>('original');
  const [imageQuality, setImageQuality] = useState<number>(100);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (materialInfo.files && materialInfo.files.length > 0) {
      // In a real app, you'd use a proper PDF library to extract pages
      // For this example, we'll simulate PDF page extraction
      const file = materialInfo.files[0];
      simulatePDFExtraction(file);
    }
  }, [materialInfo]);

  const simulatePDFExtraction = async (file: File) => {
    console.log(`Processing PDF file: ${file.name}, size: ${file.size} bytes`);
    
    setIsLoading(true);
    
    // Simulating processing delay
    setTimeout(() => {
      // Create mock PDF page URLs
      // In a real app, these would be actual extracted page images
      const mockPages = Array(5).fill(null).map((_, i) => 
        `https://picsum.photos/seed/page${i+1}/800/1100`
      );
      
      setPdfPages(mockPages);
      setIsLoading(false);
    }, 1500);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setPdfPages((items) => {
        const oldIndex = items.findIndex(item => item === active.id);
        const newIndex = items.findIndex(item => item === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const applyEnhancement = (enhancement: string) => {
    setSelectedEnhancement(enhancement);
    // In a real app, you would apply image processing here
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Extracting PDF pages...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-medium mb-4">PDF Enhancement Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enhancement Preset
            </label>
            <select 
              value={selectedEnhancement}
              onChange={(e) => applyEnhancement(e.target.value)}
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
      </div>

      <h3 className="font-medium mb-2">Arrange Pages</h3>
      <p className="text-sm text-gray-600 mb-4">
        Drag and drop to rearrange the page order.
      </p>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={pdfPages} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pdfPages.map((page, index) => (
              <SortablePDFPage 
                key={page} 
                id={page} 
                url={page} 
                pageNumber={index + 1} 
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}