'use client';

import { useState } from 'react';

type TextUploaderProps = {
  onContentChange: (content: string) => void;
};

export default function TextUploader({ onContentChange }: TextUploaderProps) {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange(newContent);
    
    // Update stats
    setCharacterCount(newContent.length);
    setWordCount(newContent.trim() === '' ? 0 : newContent.trim().split(/\s+/).length);
  };

  return (
    <div className="mb-6">
      <div className="border rounded-lg p-4">
        <div className="mb-4">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Enter Your Text Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={handleTextChange}
            placeholder="Start typing or paste your content here..."
            className="w-full h-64 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <div>Characters: {characterCount}</div>
          <div>Words: {wordCount}</div>
        </div>
      </div>
      
      <div className="mt-4 bg-blue-50 p-3 rounded text-sm">
        <h4 className="font-medium text-blue-700 mb-1">Tips for Text Content</h4>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          <li>Use clear headings to organize your content</li>
          <li>Break complex concepts into smaller paragraphs</li>
          <li>Include relevant examples when possible</li>
          <li>You can edit and format this content in the next step</li>
        </ul>
      </div>
    </div>
  );
}