'use client';
import Image from 'next/image';
import { useState } from 'react';
// import PDF1 from '@/assets/pdf/';
// import dynamic from 'next/dynamic';

const pdfUrl = '/pdf/Jamb-Life-Changer.pdf';
const videoUrl = 'https://youtu.be/0DbEPrZh25o?si=gqwWQazuWiRzCsvE';
const imageUrls = ['/mock/image1.png', '/mock/image2.png'];
// const textContent = `
//   # Introduction to Engineering
//   This course introduces the basic principles of engineering...
// `;

type MaterialType = 'pdf' | 'video' | 'images' | 'text';

export default function CourseDetailPage() {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>('text');

  return (
    <div className="flex flex-col md:flex-row min-h-screen pt-[70px]">
      {/* Main Material Section */}
      <div className="flex-1 p-6 overflow-y-auto bg-white">
        {selectedMaterial === 'pdf' && (
          <iframe src={pdfUrl} className="w-full h-[80vh]" />
        )}

        {selectedMaterial === 'video' && (
          <video controls className="w-full rounded">
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}

        {selectedMaterial === 'images' && (
          <div className="grid grid-cols-2 gap-4">
            {imageUrls.map((url, idx) => (
              <Image key={idx} src={url} width={300} height={500} alt="Study material" className="rounded shadow" />
            ))}
          </div>
        )}

        {selectedMaterial === 'text' && (
          <article className="prose max-w-none">
            <h2>Introduction to Engineering</h2>
            <p>This course introduces the basic principles of engineering...</p>
            <ul>
              <li>Topic 1: Ethics</li>
              <li>Topic 2: Physics</li>
              <li>Topic 3: Applications</li>
            </ul>
          </article>
        )}
      </div>

      {/* Sidebar (TOC) */}
      <aside className="w-full md:w-64 border-l bg-gray-50 p-4">
        <h3 className="text-lg font-semibold mb-4">Table of Contents</h3>
        <ul className="space-y-2 text-sm">
          <li><button onClick={() => setSelectedMaterial('text')}>📄 Text Summary</button></li>
          <li><button onClick={() => setSelectedMaterial('pdf')}>📕 PDF Material</button></li>
          <li><button onClick={() => setSelectedMaterial('images')}>🖼️ Diagrams</button></li>
          <li><button onClick={() => setSelectedMaterial('video')}>🎥 Video Lecture</button></li>
        </ul>
      </aside>
    </div>
  );
}
