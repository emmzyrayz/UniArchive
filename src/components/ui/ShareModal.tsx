"use client";

import {useState, useRef, useEffect} from "react";
import {useRouter} from "next/navigation";
import {
  FiX,
  FiFacebook,
  FiTwitter,
  FiLinkedin,
  FiMail,
  FiLink,
  FiMessageCircle,
  FiRepeat,
  FiShare2,
} from "react-icons/fi";

type ShareType =
  | "message"
  | "repost"
  | "copyLink"
  | "external"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "email"
  | "copy";

interface ShareModalProps {
  postId?: number;
  shareTitle: string;
  shareUrl: string;
  onClose: () => void;
  onShare: (shareType: ShareType) => void;
}

export function ShareModal({
  postId,
  shareTitle,
  shareUrl,
  onClose,
  onShare,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${shareUrl}`
      : shareUrl;

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Handle keyboard escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleMessageShare = () => {
    onShare("message");
    // You could also navigate to a messaging page:
    // router.push(`/messages/new?sharePostId=${postId}`);
  };

  const handleRepost = () => {
    onShare("repost");
    // You could also navigate to a repost page:
    // router.push(`/compose/repost?postId=${postId}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onShare("copy");
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  const handleExternalShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: shareTitle,
          url: fullUrl,
        })
        .then(() => {
          onShare("external");
        })
        .catch((error) => {
          console.error("Error sharing:", error);
        });
    } else {
      // Fallback for browsers without navigator.share
      copyToClipboard();
    }
  };

  const socialShareOptions = [
    {
      name: "Facebook",
      icon: <FiFacebook size={20} />,
      color: "bg-blue-600",
      onClick: () => onShare("facebook"),
    },
    {
      name: "Twitter",
      icon: <FiTwitter size={20} />,
      color: "bg-blue-400",
      onClick: () => onShare("twitter"),
    },
    {
      name: "LinkedIn",
      icon: <FiLinkedin size={20} />,
      color: "bg-blue-700",
      onClick: () => onShare("linkedin"),
    },
    {
      name: "Email",
      icon: <FiMail size={20} />,
      color: "bg-red-500",
      onClick: () => onShare("email"),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FiX size={24} />
        </button>

        <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-3">
          Share This Post
        </h3>

        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2">Share via social:</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {socialShareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.onClick}
                className={`${option.color} p-3 rounded-full flex items-center justify-center text-white hover:opacity-90 transition`}
                aria-label={`Share on ${option.name}`}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <button
            onClick={handleMessageShare}
            className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FiMessageCircle className="text-xl text-blue-400" />
            <span className="text-white">Message a Friend</span>
          </button>

          <button
            onClick={handleRepost}
            className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FiRepeat className="text-xl text-green-400" />
            <span className="text-white">Repost to Your Profile</span>
          </button>

          <button
            onClick={handleExternalShare}
            className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FiShare2 className="text-xl text-purple-400" />
            <span className="text-white">Share Externally</span>
          </button>
        </div>

        <div>
          <p className="text-gray-400 text-sm mb-2">Copy link:</p>
          <div className="flex items-center">
            <input
              type="text"
              value={fullUrl}
              readOnly
              className="flex-1 bg-gray-700 p-2 rounded-l-md text-white text-sm focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
