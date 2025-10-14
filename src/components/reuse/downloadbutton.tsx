import { useState } from "react";
import { Button, Tooltip } from "@/components/UI";

interface DownloadButtonProps {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  onDownload?: (fileId: string) => Promise<void> | void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "secondary";
  showLabel?: boolean;
  trackDownload?: boolean;
  className?: string;
}

export default function DownloadButton({
  fileId,
  fileName,
  fileUrl,
  onDownload,
  variant = "outline",
  showLabel = true,
  trackDownload = false,
  className = "",
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  const handleDownload = async () => {
    if (loading) return;

    setLoading(true);
    try {
      // Call the onDownload callback if provided
      if (onDownload) {
        await onDownload(fileId);
      }

      // If we have a direct file URL, trigger download
      if (fileUrl) {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Track download if enabled
      if (trackDownload) {
        setDownloadCount((prev) => prev + 1);
        // Here you would typically send analytics data
        console.log(`Download tracked for file: ${fileName}`);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFileExtension = () => {
    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  };

  const getFileIcon = () => {
    const extension = getFileExtension().toLowerCase();

    if (["pdf"].includes(extension)) {
      return "📄";
    } else if (["doc", "docx"].includes(extension)) {
      return "📝";
    } else if (["xls", "xlsx"].includes(extension)) {
      return "📊";
    } else if (["ppt", "pptx"].includes(extension)) {
      return "📽️";
    } else if (["zip", "rar", "7z"].includes(extension)) {
      return "📦";
    } else if (["mp4", "avi", "mov"].includes(extension)) {
      return "🎬";
    } else if (["mp3", "wav"].includes(extension)) {
      return "🎵";
    } else if (["jpg", "jpeg", "png", "gif"].includes(extension)) {
      return "🖼️";
    } else {
      return "📎";
    }
  };

  const button = (
    <Button
      variant={variant}
      loading={loading}
      onClick={handleDownload}
      icon={
        <span className="flex items-center gap-1">
          <span className="text-lg">{getFileIcon()}</span>
          {showLabel && (
            <span className="text-xs font-mono bg-gray-100 px-1 rounded">
              {getFileExtension()}
            </span>
          )}
        </span>
      }
      iconPosition="left"
      label={showLabel ? (loading ? "Downloading..." : "Download") : undefined}
      className={className}
    />
  );

  const tooltipText = `Download ${fileName}${
    downloadCount > 0 ? ` (${downloadCount} downloads)` : ""
  }`;

  return <Tooltip text={tooltipText}>{button}</Tooltip>;
}
