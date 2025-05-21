'use client';

import { useEffect, useState } from 'react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { FormulaModal } from '@/components/FormulaModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import katex from 'katex';

type TextUploaderProps = {
  onContentChange?: (content: string) => void;
  initialContent?: string;
};

export type Section = {
  id: string;
  type: 'title' | 'subtitle' | 'richText' | 'formula' | 'image';
  content: string;
  formatting?: {
    align?: 'left' | 'center' | 'right';
    underline?: boolean;
    bold?: boolean;
    italic?: boolean;
  };
  imageDescription?: string;
};

// Sortable item component
const SortableSection = ({ section, updateContent, removeSection, updateFormatting, updateImageDescription }: { 
  section: Section, 
  index: number,
  updateContent: (id: string, content: string) => void,
  removeSection: (id: string) => void,
  updateFormatting: (id: string, formatting: Section['formatting']) => void,
  updateImageDescription: (id: string, description: string) => void
}) => {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition 
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Effect to render formulas when they appear in the document
  useEffect(() => {
    if (section.type === 'formula' && section.content) {
      try {
        const formulaElements = document.querySelectorAll('.formula[data-formula]');
        formulaElements.forEach(element => {
          const formula = element.getAttribute('data-formula');
          if (formula) {
            katex.render(formula, element as HTMLElement, {
              throwOnError: false,
              displayMode: true
            });
          }
        });
      } catch (error) {
        console.error('Failed to render formula:', error);
      }
    }
  }, [section.type, section.content]);

  // Text formatting controls for title and subtitle
  const renderTextFormatControls = () => {
    if (section.type !== 'title' && section.type !== 'subtitle') return null;
    
    const formatting = section.formatting || { align: 'left', underline: false, bold: false, italic: false };
    
    return (
      <div className="flex items-center gap-2 mb-2 text-sm">
        <div className="flex border rounded overflow-hidden">
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              onClick={() => updateFormatting(section.id, { ...formatting, align })}
              className={`px-2 py-1 ${formatting.align === align ? 'bg-blue-100' : 'bg-white'}`}
              title={`Align ${align}`}
            >
              {align === 'left' && '⇠'}
              {align === 'center' && '⇔'}
              {align === 'right' && '⇢'}
            </button>
          ))}
        </div>
        
        <div className="flex border rounded overflow-hidden">
          <button
            onClick={() => updateFormatting(section.id, { ...formatting, bold: !formatting.bold })}
            className={`px-2 py-1 ${formatting.bold ? 'bg-blue-100' : 'bg-white'}`}
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => updateFormatting(section.id, { ...formatting, italic: !formatting.italic })}
            className={`px-2 py-1 ${formatting.italic ? 'bg-blue-100' : 'bg-white'}`}
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => updateFormatting(section.id, { ...formatting, underline: !formatting.underline })}
            className={`px-2 py-1 ${formatting.underline ? 'bg-blue-100' : 'bg-white'}`}
            title="Underline"
          >
            U
          </button>
        </div>
      </div>
    );
  };

  // Apply formatting to input elements
  const getFormattedStyle = () => {
    if (!section.formatting) return {};
    
    return {
      textAlign: section.formatting.align || 'left',
      textDecoration: section.formatting.underline ? 'underline' : 'none',
      fontWeight: section.formatting.bold ? 'bold' : 'normal',
      fontStyle: section.formatting.italic ? 'italic' : 'normal'
    };
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="section mb-4 border border-gray-200 rounded-lg p-3 bg-white shadow-sm"
    >
      <div className="flex justify-between items-center mb-2">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-move bg-gray-100 rounded p-1 hover:bg-gray-200 transition-colors"
        >
          ☰ Drag to reorder
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
          </span>
          <button 
            onClick={() => removeSection(section.id)}
            className="text-red-500 hover:text-red-700"
            aria-label="Remove section"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>

      {(section.type === 'title' || section.type === 'subtitle') && renderTextFormatControls()}

      {section.type === 'title' && (
        <input
          type="text"
          placeholder="Enter Title"
          value={section.content}
          onChange={(e) => updateContent(section.id, e.target.value)}
          style={getFormattedStyle()}
          className="w-full p-3 border border-gray-300 rounded-md font-bold text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      )}
      {section.type === 'subtitle' && (
        <input
          type="text"
          placeholder="Enter Subtitle"
          value={section.content}
          onChange={(e) => updateContent(section.id, e.target.value)}
          style={getFormattedStyle()}
          className="w-full p-3 border border-gray-300 rounded-md font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      )}
      {section.type === 'richText' && (
        <RichTextEditor
          content={section.content}
          onChange={(content) => updateContent(section.id, content)}
          editorType="full"
          className="min-h-40 border rounded"
          placeholder="Enter educational content here..."
        />
      )}
      {section.type === 'formula' && (
        <div className="formula-section p-4 border border-gray-300 rounded-md bg-gray-50">
          {section.content ? (
            <div>
              <div className="text-sm text-gray-500 mb-2">Formula (LaTeX):</div>
              <code className="block bg-gray-100 p-2 mb-3 overflow-x-auto font-mono text-sm">
                {section.content}
              </code>
              <div className="border-t pt-3">
                <div className="text-sm text-gray-500 mb-2">Preview:</div>
                <div 
                  className="formula p-2 flex justify-center items-center" 
                  data-formula={section.content}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 italic">Formula will be displayed here after insertion</div>
          )}
        </div>
      )}
      {section.type === 'image' && (
        <div className="image-section">
          {section.content ? (
            <div className="relative">
              <Image 
                src={section.content} 
                alt="Uploaded content" 
                className="max-w-full h-auto rounded-md border border-gray-200"
                width={500}
                height={300}
              />
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image Description
                </label>
                <textarea
                  value={section.imageDescription || ''}
                  onChange={(e) => updateImageDescription(section.id, e.target.value)}
                  placeholder="Add a description for this image..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-20"
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => updateContent(section.id, e.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-sm text-gray-500">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TextUploader = ({ onContentChange = () => {}, initialContent }: TextUploaderProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [currentFormulaId, setCurrentFormulaId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate unique IDs
  const generateId = () => `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Initialize with initial content if provided
  useEffect(() => {
    if (initialContent) {
      try {
        const parsedContent = JSON.parse(initialContent);
        if (Array.isArray(parsedContent)) {
          setSections(parsedContent);
        }
      } catch (error) {
        console.error("Failed to parse initial content:", error);
      }
    }
  }, [initialContent]);

  const addSection = (type: Section['type']) => {
    const newSection: Section = { 
      id: generateId(), 
      type, 
      content: '',
      ...(type === 'title' || type === 'subtitle' ? { formatting: { align: 'left', underline: false, bold: false, italic: false } } : {}),
      ...(type === 'image' ? { imageDescription: '' } : {})
    };
    setSections([...sections, newSection]);
    updateParentContent([...sections, newSection]);
  };

  const updateSectionContent = (id: string, content: string) => {
    const updatedSections = sections.map(section => 
      section.id === id ? { ...section, content } : section
    );
    setSections(updatedSections);
    updateParentContent(updatedSections);
  };

  const updateSectionFormatting = (id: string, formatting: Section['formatting']) => {
    const updatedSections = sections.map(section => 
      section.id === id ? { ...section, formatting } : section
    );
    setSections(updatedSections);
    updateParentContent(updatedSections);
  };

  const updateImageDescription = (id: string, description: string) => {
    const updatedSections = sections.map(section => 
      section.id === id ? { ...section, imageDescription: description } : section
    );
    setSections(updatedSections);
    updateParentContent(updatedSections);
  };

  const removeSection = (id: string) => {
    const updatedSections = sections.filter(section => section.id !== id);
    setSections(updatedSections);
    updateParentContent(updatedSections);
  };

  const handleFormulaInsert = (formula: string) => {
    if (formula) {
      if (currentFormulaId) {
        // Update existing formula section
        updateSectionContent(currentFormulaId, formula);
        setCurrentFormulaId(null);
      } else {
        // Create new formula section
        const newSection = { id: generateId(), type: 'formula' as const, content: formula };
        setSections([...sections, newSection]);
        updateParentContent([...sections, newSection]);
      }
    }
    setShowFormulaModal(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        updateParentContent(reordered);
        return reordered;
      });
    }
  };

  // Update the parent component with the content
  const updateParentContent = (updatedSections: Section[]) => {
    if (typeof onContentChange === 'function') {
      onContentChange(JSON.stringify(updatedSections));
    }
  };

  // Reset all sections
  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
      setSections([]);
      updateParentContent([]);
    }
  };

  // Effect to render formulas in preview mode
  useEffect(() => {
    if (previewMode) {
      try {
        // Use setTimeout to ensure the DOM is fully rendered before attempting to render formulas
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
        console.error('Failed to render formulas in preview:', error);
      }
    }
  }, [previewMode, sections]);

  // Apply formatting for preview mode
  const getPreviewStyles = (section: Section) => {
    if (!section.formatting) return {};
    
    return {
      textAlign: section.formatting.align || 'left',
      textDecoration: section.formatting.underline ? 'underline' : 'none',
      fontWeight: section.formatting.bold ? 'bold' : 'normal',
      fontStyle: section.formatting.italic ? 'italic' : 'normal'
    };
  };

  // Preview component
  const PreviewContent = () => (
    <div className="preview-container p-6 border rounded-lg bg-white">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">Content Preview</h2>
      
      {sections.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No content has been added yet. Add sections using the toolbar above.
        </div>
      ) : (
        <div className="preview-content">
          {sections.map((section) => (
            <div key={section.id} className="mb-4">
              {section.type === 'title' && (
                <h1 className="text-2xl font-bold my-2" style={getPreviewStyles(section)}>{section.content || 'Title'}</h1>
              )}
              {section.type === 'subtitle' && (
                <h2 className="text-xl font-semibold my-2" style={getPreviewStyles(section)}>{section.content || 'Subtitle'}</h2>
              )}
              {section.type === 'richText' && (
                <div className="my-3" dangerouslySetInnerHTML={{ __html: section.content || 'Rich text content will appear here' }}></div>
              )}
              {section.type === 'formula' && (
                <div className="preview-formula my-3 flex justify-center" data-formula={section.content}></div>
              )}
              {section.type === 'image' && section.content && (
                <div className="my-3">
                  <div className="flex justify-center">
                    <Image src={section.content} alt={section.imageDescription || "Content"} className="max-w-full h-auto rounded" width={500} height={300} />
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
  );

  return (
    <div className="flex flex-col mb-6 p-2 w-full h-full bg-gray-50">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white p-4 border-b shadow-sm mb-6 rounded-t-lg">
          <h1 className="text-2xl font-bold">Content Creator</h1>
          <p className="text-gray-600">Create structured content with titles, text, formulas, and images</p>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col w-full items-center justify-center p-4 gap-5 bg-white rounded-lg shadow-sm border">
          {/* Action bar */}
          <div className="flex flex-col w-full">
            <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-4">
              <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
                <button 
                  onClick={() => addSection('title')} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-all duration-300 py-2 px-3 cursor-pointer flex items-center gap-1"
                >
                  <span className="icon">T</span> Add Title
                </button>
                <button 
                  onClick={() => addSection('subtitle')} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-all duration-300 py-2 px-3 cursor-pointer flex items-center gap-1"
                >
                  <span className="icon">H</span> Add Subtitle
                </button>
                <button 
                  onClick={() => addSection('richText')} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-all duration-300 py-2 px-3 cursor-pointer flex items-center gap-1"
                >
                  <span className="icon">¶</span> Add Text
                </button>
                <button 
                  onClick={() => setShowFormulaModal(true)} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-all duration-300 py-2 px-3 cursor-pointer flex items-center gap-1"
                >
                  <span className="icon">∑</span> Add Formula
                </button>
                <button 
                  onClick={() => addSection('image')} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-all duration-300 py-2 px-3 cursor-pointer flex items-center gap-1"
                >
                  <span className="icon">📷</span> Add Image
                </button>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={clearAll} 
                  className="text-red-600 hover:text-red-800 hover:underline text-sm py-1 px-2"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setPreviewMode(!previewMode)} 
                  className={`bg-${previewMode ? 'blue-600' : 'blue-500'} hover:bg-blue-700 text-white rounded py-2 px-4 transition-colors`}
                >
                  {previewMode ? '✏️ Edit Mode' : '👁️ Preview'}
                </button>
              </div>
            </div>
          </div>

          {/* Content sections */}
          {previewMode ? (
            <PreviewContent />
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="w-full">
                {sections.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">Add content sections using the buttons above</p>
                  </div>
                ) : (
                  <SortableContext 
                    items={sections.map(s => s.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {sections.map((section, index) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        index={index}
                        updateContent={updateSectionContent}
                        removeSection={removeSection}
                        updateFormatting={updateSectionFormatting}
                        updateImageDescription={updateImageDescription}
                      />
                    ))}
                  </SortableContext>
                )}
              </div>
            </DndContext>
          )}
        </div>
      </div>

      {/* Formula Modal */}
      {showFormulaModal && (
        <FormulaModal
          onClose={() => setShowFormulaModal(false)}
          onInsert={handleFormulaInsert}
          initialFormula=''
        />
      )}
      
      {/* Save/Export Actions */}
      <div className="max-w-5xl mx-auto w-full mt-6 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500">Total sections: {sections.length}</span>
          </div>
          <div className="flex gap-3">
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors">
              Save Draft
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors">
              Publish Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}