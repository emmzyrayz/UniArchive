'use client';

import { useState, useEffect } from 'react';
// import Image from 'next/image';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortablePhoto } from './SortablePhoto';
import type { MaterialInfo } from '@/app/upload/page';

type PhotoPreviewProps = {
  materialInfo: MaterialInfo;
};

export const PhotoPreview = ({ materialInfo }: PhotoPreviewProps) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (materialInfo.files && materialInfo.files.length > 0) {
      // Log information about the files
      console.log(`Processing ${materialInfo.files.length} photo files`);
      materialInfo.files.forEach((file, index) => {
        console.log(`Photo ${index + 1}: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      });
      
      // Generate image previews from files
      const fileUrls = materialInfo.files.map(file => URL.createObjectURL(file));
      setPhotos(fileUrls);
    }
    
    // Cleanup function to revoke object URLs
    return () => {
      photos.forEach(url => URL.revokeObjectURL(url));
    };
  }, [materialInfo, photos]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex(item => item === active.id);
        const newIndex = items.findIndex(item => item === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const applyFilter = (filter: string) => {
    setSelectedFilter(filter);
    // In a real application, you would apply actual image filters
    // This is just a simulation
  };

  const applyAdjustments = () => {
    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      // In a real application, you would apply image adjustments here
      console.log(`Applying brightness: ${brightness}, contrast: ${contrast}, filter: ${selectedFilter}`);
      setIsProcessing(false);
    }, 1000);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">No Photos Found</h2>
        <p>Unable to generate previews for the uploaded photos.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-medium mb-4">Photo Enhancement Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter
            </label>
            <select 
              value={selectedFilter}
              onChange={(e) => applyFilter(e.target.value)}
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
          onClick={applyAdjustments}
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
      </div>

      <h3 className="font-medium mb-2">Arrange Photos</h3>
      <p className="text-sm text-gray-600 mb-4">
        Drag and drop to rearrange the photos.
      </p>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={photos} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <SortablePhoto 
                key={photo} 
                id={photo} 
                url={photo} 
                index={index + 1} 
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <div className="bg-blue-50 p-3 rounded text-sm mt-6">
        <h4 className="font-medium text-blue-700 mb-1">Photo Processing Notes</h4>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          <li>Filters are applied non-destructively</li>
          <li>Original image quality is preserved in the background</li>
          <li>For best results, upload high-resolution images</li>
        </ul>
      </div>
    </div>
  );
}