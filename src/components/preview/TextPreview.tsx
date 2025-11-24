'use client';

import { useState, useEffect } from 'react';
import type { MaterialInfo } from '@/types/materialUpload';
import { Section } from '@/components/upload/TextUploader';
import Image from 'next/image';
import katex from 'katex';

export type TextPreviewProps = {
  materialInfo: MaterialInfo;
};

export const TextPreview = ({ materialInfo }: TextPreviewProps) => {
  const [parsedSections, setParsedSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState<string>('medium');
  const [lineSpacing, setLineSpacing] = useState<number>(1.6);
  const [showRawText, setShowRawText] = useState(false);
  const [rawTextContent, setRawTextContent] = useState<string>('');
  
  
  // Load content from file
   // Load content - FIXED: Now properly handles textContent from materialInfo
  useEffect(() => {
    console.log('MaterialInfo received:', materialInfo);
    
    // First priority: Check if we have textContent (structured content)
    if (materialInfo.textContent) {
      console.log('Found textContent:', materialInfo.textContent);
      
      try {
        const parsed = JSON.parse(materialInfo.textContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('Successfully parsed sections:', parsed);
          setParsedSections(parsed);
          setRawTextContent(materialInfo.textContent); // Store raw JSON for raw view
          setShowRawText(false);
        } else {
          console.log('TextContent is not a valid sections array');
          setRawTextContent(materialInfo.textContent);
          setShowRawText(true);
        }
      } catch (error) {
        console.error('Error parsing textContent:', error);
        setRawTextContent(materialInfo.textContent);
        setShowRawText(true);
      }
      
      setIsLoading(false);
    } 
    // Second priority: Check if we have files (for backward compatibility)
    else if (materialInfo.files && materialInfo.files.length > 0) {
      console.log('Found files, reading first file:', materialInfo.files[0].name);
      
      const file = materialInfo.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        console.log('File content loaded:', content.substring(0, 100) + '...');
        
        setRawTextContent(content);
        
        // Try parsing as JSON (structured content)
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
            console.log('File contains structured sections');
            setParsedSections(parsed);
            setShowRawText(false);
          } else {
            console.log('File contains plain text');
            setShowRawText(true);
          }
        } catch {
          console.log('File is not JSON format, treating as plain text');
          setShowRawText(true);
        }
        
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
    } 
    // No content found
    else {
      console.log('No textContent or files found');
      setIsLoading(false);
    }
  }, [materialInfo]);

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

  // Check if we have any content to display
  const hasContent = parsedSections.length > 0 || rawTextContent.trim() !== '';


  if (!hasContent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">No Content Found</h2>
        <p className="text-gray-600 mb-4">
          No text content was found in the uploaded material.
        </p>
        <div className="text-sm text-gray-500">
          <p>Debug info:</p>
          <p>Has textContent: {materialInfo.textContent ? 'Yes' : 'No'}</p>
          <p>Has files: {materialInfo.files?.length ? `Yes (${materialInfo.files.length})` : 'No'}</p>
          <p>Parsed sections: {parsedSections.length}</p>
        </div>
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
          <div>
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <p className="text-sm text-blue-700">
                <strong>Raw Content:</strong> This shows the raw content as stored in the system.
              </p>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border">
              {rawTextContent}
            </pre>
          </div>
        ) : (
          <div className="preview-formatted">
            {parsedSections.length === 0 ? (
               <div className="text-center py-10 text-gray-500">
                <p>No formatted content available.</p>
                <p className="text-sm mt-2">Try switching to raw text view to see the content.</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                  <p className="text-sm text-green-700">
                    <strong>Formatted Content:</strong> Showing {parsedSections.length} section(s) with proper formatting.
                  </p>
                </div>

                {parsedSections.map((section) => (
                  <div key={section.id} className="mb-4">
                    {section.type === 'title' && (
                      <h1 
                        className="text-2xl font-bold my-2" 
                        style={getPreviewStyles(section)}
                      >
                        {section.content || 'Untitled'}
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
                        className="my-3 prose max-w-none" 
                        dangerouslySetInnerHTML={{ __html: section.content || '<p><em>No content</em></p>' }}
                      ></div>
                    )}
                    
                    {section.type === 'formula' && (
                      <div className="my-3 flex justify-center">
                        <div 
                          className="preview-formula p-4 bg-gray-50 rounded border" 
                          data-formula={section.content}
                        ></div>
                      </div>
                    )}
                    
                    {section.type === 'image' && section.content && (
                      <div className="my-4">
                        <div className="flex justify-center">
                          <Image 
                            src={section.content} 
                            alt={section.imageDescription || "Content image"} 
                            className="max-w-full h-auto rounded border shadow-sm" 
                            width={500} 
                            height={300} 
                          />
                        </div>
                        {section.imageDescription && (
                          <p className="text-gray-600 italic text-center mt-3 max-w-2xl mx-auto">
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
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {materialInfo.topic || 'Unnamed Document'}
          </span>
          <span className="text-sm text-gray-500">
            {parsedSections.length} sections
          </span>
          {materialInfo.files && materialInfo.files.length > 0 && (
            <span className="text-sm text-gray-500">
              Source: {materialInfo.files[0].name}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md text-sm transition-colors">
            Edit Content
          </button>
          <button className="bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 px-4 rounded-md text-sm transition-colors">
            Export
          </button>
        </div>
      </div>
    </div>
  );
};