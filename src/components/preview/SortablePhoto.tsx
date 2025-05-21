'use client';

import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortablePhotoProps = {
  id: string;
  url: string;
  index: number;
};

export function SortablePhoto({ id, url, index }: SortablePhotoProps) {
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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative border rounded overflow-hidden cursor-move bg-white shadow-sm hover:shadow-md transition-shadow"
      {...attributes} 
      {...listeners}
    >
      <div className="absolute top-0 left-0 bg-black text-white text-xs px-2 py-1 rounded-br z-10">
        Photo {index}
      </div>
      <div className="relative w-full h-48">
        <Image 
          src={url} 
          alt={`Photo ${index}`}
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
}