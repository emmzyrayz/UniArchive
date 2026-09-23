// components/upload/FileDropzone.tsx
"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — placeholder, confirm against real storage limits later
const ACCEPTED_TYPE = "application/pdf";

interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string;
}

export function FileDropzone({ file, onFileSelect, error }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = (candidate: File) => {
    if (candidate.type !== ACCEPTED_TYPE) {
      onFileSelect(null);
      return "Only PDF files are supported right now.";
    }
    if (candidate.size > MAX_FILE_SIZE) {
      onFileSelect(null);
      return `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }
    onFileSelect(candidate);
    return null;
  };

  const [localError, setLocalError] = useState<string | null>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setLocalError(validateAndSet(dropped));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setLocalError(validateAndSet(selected));
  };

  const displayError = error || localError;

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-text-secondary">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {file.name}
          </p>
          <p className="text-xs text-text-muted">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFileSelect(null)}
          className="text-sm text-text-secondary hover:text-error shrink-0"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-accent bg-neutral-50"
            : "border-border-strong hover:border-accent"
        }`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-text-muted"
        >
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        <p className="text-sm text-text-primary font-medium">
          Drag and drop your PDF, or click to browse
        </p>
        <p className="text-xs text-text-muted">
          PDF only, up to {MAX_FILE_SIZE / 1024 / 1024}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {displayError && (
        <p className="text-sm text-error mt-2">{displayError}</p>
      )}
    </div>
  );
}
