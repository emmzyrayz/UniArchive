import { useState } from "react";
import { Modal, Button, Input, Alert } from "@/components/UI";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  description?: string;
  onShare?: (platform: string, url: string) => void;
  className?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  title,
  url,
  description,
  onShare,
  className = "",
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const sharePlatforms = [
    {
      name: "Facebook",
      icon: "📘",
      color: "bg-blue-600 hover:bg-blue-700",
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
    },
    {
      name: "Twitter",
      icon: "🐦",
      color: "bg-sky-500 hover:bg-sky-600",
      shareUrl: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(title)}`,
    },
    {
      name: "LinkedIn",
      icon: "💼",
      color: "bg-blue-700 hover:bg-blue-800",
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
    },
    {
      name: "WhatsApp",
      icon: "💚",
      color: "bg-green-500 hover:bg-green-600",
      shareUrl: `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
    },
    {
      name: "Email",
      icon: "📧",
      color: "bg-gray-600 hover:bg-gray-700",
      shareUrl: `mailto:?subject=${encodeURIComponent(
        title
      )}&body=${encodeURIComponent(url)}`,
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlatformShare = (platform: (typeof sharePlatforms)[0]) => {
    if (onShare) {
      onShare(platform.name, url);
    }

    // Open share window
    window.open(platform.shareUrl, "_blank", "width=600,height=400");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Content"
      size="md"
      className={className}
    >
      <div className="space-y-6">
        {/* Content Preview */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 mb-2">{description}</p>
          )}
          <p className="text-xs text-gray-500 break-all">{url}</p>
        </div>

        {/* Copy Link */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Share this link
          </label>
          <div className="flex gap-2">
            <Input value={url} name={url} disabled className="flex-1" />
            <Button
              variant={copied ? "secondary" : "primary"}
              label={copied ? "Copied!" : "Copy"}
              onClick={copyToClipboard}
            />
          </div>
          {copied && (
            <Alert
              type="success"
              message="Link copied to clipboard!"
              className="py-2"
            />
          )}
        </div>

        {/* Share Platforms */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Share via</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {sharePlatforms.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handlePlatformShare(platform)}
                className={`
                  flex flex-col items-center justify-center p-4 rounded-lg text-white
                  transition-all duration-200 hover:scale-105
                  ${platform.color}
                `}
              >
                <span className="text-2xl mb-1">{platform.icon}</span>
                <span className="text-xs font-medium">{platform.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Embed Code (Optional) */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Embed Code
          </label>
          <div className="flex gap-2">
            <Input
              name={`<iframe src="${url}" width="100%" height="400"></iframe>`}
              value={`<iframe src="${url}" width="100%" height="400"></iframe>`}
              disabled
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="outline"
              label="Copy"
              onClick={() => {
                const embedCode = `<iframe src="${url}" width="100%" height="400"></iframe>`;
                navigator.clipboard.writeText(embedCode);
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
