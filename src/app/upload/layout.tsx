// upload/layout.tsx
'use client';
import React from 'react';

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Upload Material</h1>
        {children}
      </div>
    </div>
  );
}
