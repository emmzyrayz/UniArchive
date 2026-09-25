// app/upload/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser, type User } from "@/context/userContext";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { TagInput } from "@/components/UI/TagInput";
import AuthInput from "@/app/auth/components/UI/AuthInput";
import { Button } from "@/components/UI/Buttons";
import { queueUpload } from "@/utils/uploadQueue";
import { uploadBook } from "@/utils/uploadBook";
import { compressPdf, type CompressionResult } from "@/lib/compressPdf";
import { formatFileSize } from "@/assets/data/libraryData";
import {
  AcademicInfoSection,
  type AcademicInfo,
} from "@/components/upload/AcademicInfoSection";
import { PROFILE_LEVELS, PROFILE_SEMESTERS } from "@/lib/constants/profile";

const COMPRESS_MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadFormState {
  title: string;
  description: string;
  tags: string[];
}

/** The profile's academic info, in the shape the upload form stores. */
function academicFromProfile(profile: User | null): AcademicInfo {
  if (!profile) return {};
  return {
    universityId: profile.universityId,
    universityName: profile.universityName,
    universityAbbr: profile.universityAbbr,
    facultyId: profile.universityId ? profile.facultyId : undefined,
    facultyName: profile.universityId ? profile.facultyName : undefined,
    departmentId: profile.facultyId ? profile.departmentId : undefined,
    departmentName: profile.facultyId ? profile.departmentName : undefined,
    // Older accounts may hold free-text values the API won't accept
    level: (PROFILE_LEVELS as readonly string[]).includes(profile.level) ? profile.level : undefined,
    semester:
      profile.semester && (PROFILE_SEMESTERS as readonly string[]).includes(profile.semester)
        ? profile.semester
        : undefined,
  };
}

export default function UploadPage() {
  const router = useRouter();
  const { hasActiveSession, isLoading, userProfile } = useUser();

  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<UploadFormState>({
    title: "",
    description: "",
    tags: [],
  });
  // null until the user edits it: until then it follows the profile
  const [academicEdits, setAcademicEdits] = useState<AcademicInfo | null>(null);
  const profileAcademic = academicFromProfile(userProfile);
  const academic = academicEdits ?? profileAcademic;
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
   // Compression loads the whole PDF into memory; skip it for large files
   if (selected && selected.size <= COMPRESS_MAX_SIZE) {
     setIsCompressing(true);
     compressPdf(selected).then((result) => {
       setFile(result.file); // replace with compressed version
       setCompression(result);
       setIsCompressing(false);
     });
   } else {
     setIsCompressing(false);
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
      universityId: academic.universityId,
      facultyId: academic.facultyId,
      departmentId: academic.departmentId,
      level: academic.level,
      semester: academic.semester,
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
      await uploadBook(
        file,
        {
          ...formData,
          universityId: academic.universityId,
          facultyId: academic.facultyId,
          departmentId: academic.departmentId,
          level: academic.level,
          semester: academic.semester,
        },
        setProgress,
      );
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
                setAcademicEdits(null);
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

          <AcademicInfoSection
            value={academic}
            profile={profileAcademic}
            onChange={setAcademicEdits}
          />

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
