'use client';

import { useState, useEffect } from 'react';
import type { MaterialInfo } from '@/app/upload/page';
import { Section } from '@/components/upload/TextUploader';
import Image from 'next/image';
import katex from 'katex';

type TextPreviewProps = {
  materialInfo: MaterialInfo;
};

export const TextPreview = ({ materialInfo }: TextPreviewProps) => {
  const [textContent, setTextContent] = useState<string>('');
  const [parsedSections, setParsedSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState<string>('medium');
  const [lineSpacing, setLineSpacing] = useState<number>(1.6);
  const [showRawText, setShowRawText] = useState(false);
  
  // Load content from file
  useEffect(() => {
    if (materialInfo.files && materialInfo.files.length > 0) {
      const file = materialInfo.files[0];
      console.log(`Processing file: ${file.name}, type: ${file.type}`);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        setTextContent(content);
        
        // Try parsing as JSON (structured content)
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
            setParsedSections(parsed);
            setShowRawText(false);
          } else {
            // If not valid sections format, treat as raw text
            setShowRawText(true);
          }
        } catch {
          // If parsing fails, treat as raw text (removed unused error variable)
          console.log('Not JSON format, treating as raw text');
          setShowRawText(true);
        }
        
        setIsLoading(false);
      };
      reader.onerror = () => {
        console.error('Error reading file');
        setIsLoading(false);
      };
      reader.readAsText(file);
    } else {
      setIsLoading(false);
    }
  }, [materialInfo.files]);

  // Render formulas
  useEffect(() => {
    if (!showRawText && parsedSections.length > 0) {
      try {
        setTimeout(() => {
          const formulaElements = document.querySelectorAll('.preview-formula[data-formula]');
          formulaElements.forEach(element => {
            const formula = element.getAttribute('data-formula');
            if (formula) {
              katex.render(formula, element as HTMLElement, {
                throwOnError: false,
                displayMode: true
              });
            }
          });
        }, 100);
      } catch (error) {
        console.error('Failed to render formulas:', error);
      }
    }
  }, [parsedSections, showRawText]);

  // Get style based on section formatting
  const getPreviewStyles = (section: Section) => {
    if (!section.formatting) return {};
    
    return {
      textAlign: section.formatting.align || 'left',
      textDecoration: section.formatting.underline ? 'underline' : 'none',
      fontWeight: section.formatting.bold ? 'bold' : 'normal',
      fontStyle: section.formatting.italic ? 'italic' : 'normal'
    };
  };

  // Get font size class
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      case 'x-large': return 'text-xl';
      default: return 'text-base'; // medium
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading content...</p>
      </div>
    );
  }

  if (!textContent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">No Content Found</h2>
        <p>Unable to load content from the uploaded file.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-medium mb-4">Display Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Font Size Controls */}
          <div>
            <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 mb-1">
              Font Size
            </label>
            <select
              id="font-size"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="x-large">Extra Large</option>
            </select>
          </div>
          
          {/* Line Spacing Controls */}
          <div>
            <label htmlFor="line-spacing" className="block text-sm font-medium text-gray-700 mb-1">
              Line Spacing
            </label>
            <select
              id="line-spacing"
              value={lineSpacing}
              onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="1.2">Compact</option>
              <option value="1.6">Normal</option>
              <option value="2">Relaxed</option>
              <option value="2.5">Spacious</option>
            </select>
          </div>
          
          {/* View Mode Toggle */}
          <div>
            <label htmlFor="view-mode" className="block text-sm font-medium text-gray-700 mb-1">
              View Mode
            </label>
            <div className="flex">
              <button
                onClick={() => setShowRawText(false)}
                className={`flex-grow py-2 px-3 ${!showRawText ? 'bg-blue-500 text-white' : 'bg-gray-200'} border border-gray-300 rounded-l`}
              >
                Formatted
              </button>
              <button
                onClick={() => setShowRawText(true)}
                className={`flex-grow py-2 px-3 ${showRawText ? 'bg-blue-500 text-white' : 'bg-gray-200'} border border-gray-300 rounded-r`}
              >
                Raw
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Display */}
      <div 
        className={`preview-content p-6 border rounded-lg bg-white ${getFontSizeClass()}`}
        style={{ lineHeight: lineSpacing }}
      >
        {showRawText ? (
          <pre className="whitespace-pre-wrap font-mono text-sm">{textContent}</pre>
        ) : (
          <div className="preview-formatted">
            {parsedSections.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No formatted content available. Try switching to raw text view.
              </div>
            ) : (
              <div>
                {parsedSections.map((section) => (
                  <div key={section.id} className="mb-4">
                    {section.type === 'title' && (
                      <h1 
                        className="text-2xl font-bold my-2" 
                        style={getPreviewStyles(section)}
                      >
                        {section.content || 'Title'}
                      </h1>
                    )}
                    
                    {section.type === 'subtitle' && (
                      <h2 
                        className="text-xl font-semibold my-2" 
                        style={getPreviewStyles(section)}
                      >
                        {section.content || 'Subtitle'}
                      </h2>
                    )}
                    
                    {section.type === 'richText' && (
                      <div 
                        className="my-3" 
                        dangerouslySetInnerHTML={{ __html: section.content || 'Rich text content will appear here' }}
                      ></div>
                    )}
                    
                    {section.type === 'formula' && (
                      <div className="my-3 flex justify-center">
                        <div 
                          className="preview-formula p-2" 
                          data-formula={section.content}
                        ></div>
                      </div>
                    )}
                    
                    {section.type === 'image' && section.content && (
                      <div className="my-3">
                        <div className="flex justify-center">
                          <Image 
                            src={section.content} 
                            alt={section.imageDescription || "Content image"} 
                            className="max-w-full h-auto rounded" 
                            width={500} 
                            height={300} 
                          />
                        </div>
                        {section.imageDescription && (
                          <p className="text-gray-600 italic text-center mt-2 max-w-lg mx-auto">
                            {section.imageDescription}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Information and Download */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {materialInfo.topic || 'Unnamed Document'}
          </span>
          {materialInfo.files && materialInfo.files.length > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              {materialInfo.files[0].name}
            </span>
          )}
        </div>
        <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-1 px-3 rounded-md text-sm transition-colors">
          Download
        </button>
      </div>
    </div>
  );
};