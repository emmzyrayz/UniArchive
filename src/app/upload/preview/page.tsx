'use client';

export default function PreviewUpload() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Step 3: Preview</h2>
      <p className="text-gray-600 mb-4">Here’s a preview of your submission. Please verify all details before submitting.</p>
      
      {/* Replace with previewed data when you wire this up with state/context or localStorage */}
      <div className="bg-gray-100 p-4 rounded mb-4">[Preview Content Placeholder]</div>

      <div className="flex justify-between">
        <a href="/upload" className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Back</a>
        <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Submit</button>
      </div>
    </div>
  );
}
