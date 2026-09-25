// src/components/profile/AvatarUploader.tsx
// Click the avatar → pick an image → preview immediately → signed direct
// upload to Cloudinary (XHR for progress). The resulting secure_url is
// handed to the parent; it's only saved to the profile on "Save Changes".
"use client";

import { useEffect, useRef, useState } from "react";
import { FiCamera } from "react-icons/fi";
import { ProfileAvatar } from "@/components/profile/profileUi";

// Cloudinary's free-plan limit for image uploads
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

interface SignedUpload {
  uploadUrl: string;
  fields: Record<string, string>;
}

function uploadWithProgress(
  signed: SignedUpload,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(signed.fields)) form.append(key, value);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { secure_url?: string };
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve(body.secure_url);
        } else {
          reject(new Error(`Cloudinary upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Cloudinary returned an unreadable response"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

interface Props {
  name: string;
  /** The saved or newly uploaded avatar URL. */
  photoUrl?: string | null;
  onUploaded: (secureUrl: string) => void;
  /** Lets the parent block saving while an upload is in flight. */
  onUploadingChange?: (uploading: boolean) => void;
}

export default function AvatarUploader({
  name,
  photoUrl,
  onUploaded,
  onUploadingChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Release the blob URL when it's replaced or the page unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image must be 10 MB or smaller.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setProgress(0);
    onUploadingChange?.(true);
    try {
      const res = await fetch("/api/upload/avatar/presign", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`Presign failed (${res.status})`);
      const signed = (await res.json()) as SignedUpload;
      const secureUrl = await uploadWithProgress(signed, file, setProgress);
      onUploaded(secureUrl);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError("Upload failed, try again");
      setPreviewUrl(null);
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
    }
  };

  const uploading = progress !== null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:cursor-wait"
        aria-label="Upload a new profile photo"
      >
        <ProfileAvatar name={name} photoUrl={previewUrl ?? photoUrl} />
        <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white">
          <FiCamera size={22} />
        </span>
        <span className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center ring-2 ring-white dark:ring-neutral-800">
          <FiCamera size={14} />
        </span>
        {uploading && (
          <span className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center text-white text-sm font-semibold">
            {progress}%
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-picking the same file
          if (file) void handleFile(file);
        }}
      />
      <p className="text-xs text-text-muted">
        {uploading ? "Uploading…" : "Click to upload new avatar"}
      </p>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
