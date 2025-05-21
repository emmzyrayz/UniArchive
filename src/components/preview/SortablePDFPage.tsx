'use client';

import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortablePDFPageProps = {
  id: string;
  url: string;
  pageNumber: number;
};

export const SortablePDFPage = ({ id, url, pageNumber }: SortablePDFPageProps) => {
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
      <div className="absolute top-0 left-0 bg-black text-white text-xs px-2 py-1 rounded-br">
        Page {pageNumber}
      </div>
      <div className="relative w-full h-64">
        <Image 
          src={url} 
          alt={`PDF Page ${pageNumber}`}
          className="object-contain"
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