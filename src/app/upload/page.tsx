// app/upload/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@/context/userContext";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { TagInput } from "@/components/UI/TagInput";
import AuthInput from "@/app/auth/components/UI/AuthInput";
import { Button } from "@/components/UI/Buttons";
import { queueUpload } from "@/utils/uploadQueue";
import { compressPdf, type CompressionResult } from "@/lib/compressPdf";
import { formatFileSize } from "@/assets/data/libraryData";

interface UploadFormState {
  title: string;
  description: string;
  tags: string[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data as { message?: string }).message ?? "Upload failed. Please try again.",
    );
  }
  return data as T;
}

// fetch() can't report upload progress, so the PUT to storage uses XHR.
function putFileWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage rejected the upload (HTTP ${xhr.status}).`));
    xhr.onerror = () => reject(new Error("Network error while uploading the file."));
    xhr.send(file);
  });
}

// Multipart POST straight to Cloudinary, with the fields signed by presign.
function postFormWithProgress(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = `Storage rejected the upload (HTTP ${xhr.status}).`;
      try {
        const data = JSON.parse(xhr.responseText) as { error?: { message?: string } };
        if (data.error?.message) message = data.error.message;
      } catch {
        // keep the generic message
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading the file."));
    xhr.send(form);
  });
}

type PresignResponse =
  | {
      provider: "cloudinary";
      uploadUrl: string;
      fields: Record<string, string>;
      publicId: string;
    }
  | { provider: "backblaze"; uploadUrl: string; storageKey: string };

/**
 * 1. Ask the server for a signed upload (Cloudinary up to 80 MB, B2 above)
 * 2. Upload the file straight to storage
 * 3. Create the book record
 */
async function uploadBook(
  file: File,
  form: UploadFormState,
  onProgress: (percent: number) => void,
): Promise<void> {
  const presign = await postJson<PresignResponse>("/api/upload/presign", {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
  const details = {
    title: form.title.trim(),
    description: form.description.trim(),
    tags: form.tags,
  };

  // Keep the last few percent for the record-creation step
  if (presign.provider === "cloudinary") {
    await postFormWithProgress(presign.uploadUrl, presign.fields, file, (p) =>
      onProgress(p * 0.95),
    );
    await postJson("/api/upload/finalize", {
      ...details,
      publicId: presign.publicId,
    });
  } else {
    await putFileWithProgress(presign.uploadUrl, file, (p) => onProgress(p * 0.95));
    await postJson("/api/books", {
      ...details,
      storageKey: presign.storageKey,
      fileSize: file.size,
      mimeType: file.type,
    });
  }
  onProgress(100);
}

export default function UploadPage() {
  const router = useRouter();
  const { hasActiveSession, isLoading } = useUser();

  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<UploadFormState>({
    title: "",
    description: "",
    tags: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [compression, setCompression] = useState<CompressionResult | null>(
    null,
  );
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.push("/auth?view=signin");
    }
  }, [isLoading, hasActiveSession, router]);

  // Auto-fill title from filename if the user hasn't typed one yet
  const titleTouched = useRef(false);
 const handleFileSelect = (selected: File | null) => {
   setFile(selected);
   setCompression(null);
   if (selected && !titleTouched.current) {
     const nameWithoutExt = selected.name.replace(/\.pdf$/i, "");
     setFormData((prev) => ({ ...prev, title: nameWithoutExt }));
   }
   if (selected) {
     setIsCompressing(true);
     compressPdf(selected).then((result) => {
       setFile(result.file); // replace with compressed version
       setCompression(result);
       setIsCompressing(false);
     });
   }
 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!file) newErrors.file = "Please select a PDF to upload.";
    if (!formData.title.trim())
      newErrors.title = "Please give your document a title.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0 || !file) return;

    setIsUploading(true);
    setProgress(0);
    setUploadError("");

      if (!navigator.onLine) {
    // Queue for background sync
    const fileData = await file.arrayBuffer();
    await queueUpload({
      id: `upload-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      tags: formData.tags,
      fileData,
      fileName: file.name,
      fileType: file.type,
      queuedAt: new Date().toISOString(),
    });
    setProgress(100);
    setWasQueued(true);
    setIsComplete(true);
    setIsUploading(false);
    return;
  }

    try {
      await uploadBook(file, formData, setProgress);
      router.push("/home");
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed. Please try again.",
      );
      setIsUploading(false);
    }
  };

  if (isLoading || !hasActiveSession) {
    return null;
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center mt-[50px] px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-xl border border-border bg-surface-raised p-8 text-center"
        >
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-text-primary">
  {wasQueued ? "Upload queued" : "Upload complete"}
</h1>
<p className="text-sm text-text-secondary mt-2 mb-6">
  {wasQueued
    ? `"${formData.title}" will upload automatically when you reconnect.`
    : `"${formData.title}" has been added to your library.`}
</p>
          <div className="flex gap-3 justify-center">
            <Button href="/home" variant="secondary">
              Back to library
            </Button>
            <Button
              onClick={() => {
                setIsComplete(false);
                setFile(null);
                setFormData({ title: "", description: "", tags: [] });
                titleTouched.current = false;
                setWasQueued(false);
              }}
            >
              Upload another
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            Upload a document
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Add a PDF to your personal library.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-border bg-surface-raised p-8"
          noValidate
        >
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Document
            </label>
            <FileDropzone
              file={file}
              onFileSelect={handleFileSelect}
              error={errors.file}
            />
          </div>

          {isCompressing && (
            <p className="text-xs text-text-muted">Optimising file size...</p>
          )}
          {compression && compression.saving > 0 && (
            <p className="text-xs text-success">
              ✓ Compressed {formatFileSize(compression.originalSize)} →{" "}
              {formatFileSize(compression.compressedSize)} (saved{" "}
              {compression.saving}%)
            </p>
          )}
          {compression && compression.saving === 0 && (
            <p className="text-xs text-text-muted">
              Already optimised — no size reduction possible.
            </p>
          )}

          <AuthInput
            name="title"
            label="Title"
            type="text"
            placeholder="e.g. Linear Algebra I — Lecture Notes"
            value={formData.title}
            onChange={(e) => {
              titleTouched.current = true;
              setFormData((prev) => ({ ...prev, title: e.target.value }));
            }}
            error={errors.title}
            required
          />

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-text-secondary"
            >
              Description <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="What's this document about?"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-4 py-3 border rounded-md text-text-primary bg-background border-border focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">
              Tags <span className="text-text-muted">(optional, up to 6)</span>
            </label>
            <TagInput
              tags={formData.tags}
              onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
            />
          </div>

          {uploadError && (
            <p role="alert" className="text-sm text-error">
              {uploadError}
            </p>
          )}

          {isUploading ? (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
              <p className="text-xs text-text-secondary text-center">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          ) : (
            <Button type="submit" size="lg">
              Upload document
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
