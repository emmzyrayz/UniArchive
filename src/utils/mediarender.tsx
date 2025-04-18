import React, {useState, useEffect} from "react";
import Image, { StaticImageData } from "next/image";
import { IconType } from 'react-icons'; // Import IconType from react-icons
import { IoImageOutline } from 'react-icons/io5'; // Default loading icon
import { IoAlertCircleOutline } from 'react-icons/io5'; // Default error icon

// Types for different image sources
type ImageSource = {
  url: string | StaticImageData;
  type: "image";
  alt?: string;
  priority?: boolean;
};

type SVGSource = {
  url: string;
  type: "svg";
  alt?: string;
};

type IconSource = {
  icon: IconType;
  type: "icon";
  color?: string;
  size?: number;
};

type VisualSource = ImageSource | SVGSource | IconSource;

interface MediaProps {
  sources: VisualSource[];
  className?: string;
  containerStyle?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  fallbackIcon?: IconType | null; // Made optional with null
  onLoadError?: (failedSource: VisualSource) => void;
  onLoadSuccess?: (loadedSource: VisualSource) => void;
  returnNull?: boolean; // New prop to control null return behavior
}

export const MediaRenderer: React.FC<MediaProps> = ({
  sources,
  className = "",
  containerStyle = {},
  width = "100%",
  height = "100%",
  fallbackIcon = null, // Default to null instead of AlertCircle
  onLoadError,
  onLoadSuccess,
  returnNull = true, // Default to returning null
}) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Early return if no sources provided
  if (!sources || sources.length === 0) {
    return null;
  }

  const currentSource = sources[currentSourceIndex];

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setCurrentSourceIndex(0);
  }, [sources]);

  const handleError = () => {
    onLoadError?.(currentSource);

    if (currentSourceIndex < sources.length - 1) {
      setCurrentSourceIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoadSuccess?.(currentSource);
  };

  const renderContent = () => {
    if (hasError) {
      if (returnNull) {
        return null;
      }
      if (fallbackIcon) {
        const FallbackIcon = fallbackIcon;
        return <FallbackIcon className="text-gray-400" size={24} />;
      }
      return null;
    }

    switch (currentSource.type) {
      case "image":
        return (
          <div className="relative flex items-center justify-center w-full h-full">
            <Image
              src={currentSource.url}
              alt={currentSource.alt || ""}
              fill
              style={{objectFit: "cover"}}
              priority={currentSource.priority}
              onError={handleError}
              onLoad={handleLoad}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 100vw"
              className={`w-full h-full ${className}`}
            />
          </div>
        );

      case "svg":
        return (
          <object
            data={currentSource.url}
            type="image/svg+xml"
            className="w-full h-full"
            onError={handleError}
            onLoad={handleLoad}
          >
            <img
              src={currentSource.url}
              alt={currentSource.alt || ""}
              className="w-full h-full"
              onError={handleError}
              onLoad={handleLoad}
            />
          </object>
        );

      case "icon":
        const IconComponent = currentSource.icon;
        return (
          <IconComponent
            color={currentSource.color || "currentColor"}
            size={currentSource.size || 24}
            onError={handleError}
            onLoad={handleLoad}
          />
        );

      default:
        return null;
    }
  };

  // If loading and returnNull is true, return null instead of loading indicator
  if (isLoading && returnNull) {
    return null;
  }

  const content = renderContent();

  // Return null if there's no content and returnNull is true
  if (!content && returnNull) {
    return null;
  }

  return (
    <div
      className={`relative flex items-center justify-center w-full h-full ${className}`}
      style={{
        width,
        height,
        ...containerStyle,
      }}
    >
      {isLoading && !returnNull && (
        <div className="absolute inset-0 flex items-center justify-center">
          <IoImageOutline className="animate-pulse text-gray-300" />
        </div>
      )}
      {content}
    </div>
  );
};
