import { useState, useEffect, useRef, ReactNode } from "react";
import { Card, Skeleton } from "@/components/UI";
import Image from "next/image";
import { ImageSource, getImageByID } from "@/assets/data/imagesData";

export interface BaseSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: ImageSource;
  imageId?: string;
  icon?: ReactNode;
  metadata?: Record<string, unknown>;
}

export type SectionType =
  | "default"
  | "blog"
  | "course"
  | "instructor"
  | "department"
  | "faculty"
  | "category"
  | "user";

export type LayoutType = "grid" | "horizontal-scroll" | "vertical-scroll";

interface DynamicSectionProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  sectionType?: SectionType;
  renderItem?: (item: T, index: number) => ReactNode;
  layout?: LayoutType;
  initialDisplayCount?: number;
  maxDisplayCount?: number;
  autoScroll?: boolean;
  autoScrollInterval?: number;
  resetTimeout?: number;
  onViewAll?: () => void;
  onItemClick?: (item: T) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
  className?: string;
  mapper?: (item: T) => BaseSectionItem;
  showViewAllButton?: boolean;
}

const getMetadataValue = (
  metadata: Record<string, unknown> | undefined,
  key: string
): string | undefined => {
  if (metadata && metadata[key] !== undefined && metadata[key] !== null) {
    return String(metadata[key]);
  }
  return undefined;
};

// Helper function to resolve image source from ID or direct source
const resolveImageSource = (
  image?: ImageSource,
  imageId?: string
): string | undefined => {
  // If imageId is provided, look it up
  if (imageId) {
    const imageAsset = getImageByID(imageId);
    if (imageAsset) {
      // Extract the actual string path from the ImageAsset
      const src = imageAsset.src;
      // If src is a StaticImageData object, get its src property
      if (typeof src === 'object' && src !== null && 'src' in src) {
        return src.src;
      }
      // If it's already a string, return it
      if (typeof src === 'string') {
        return src;
      }
    }
  }
  
  // If image is provided directly, use it
  if (image) {
    // If image is a StaticImageData object, get its src property
    if (typeof image === 'object' && image !== null && 'src' in image) {
      return image.src;
    }
    // If it's already a string, return it
    if (typeof image === 'string') {
      return image;
    }
  }
  
  return undefined;
};

// Helper component to safely render images
const SafeImage = ({
  src,
  alt,
  width,
  height,
  className,
}: {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) => {
  if (!src) {
    return (
      <div
        className={`bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-4xl text-gray-400">🖼️</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
};

export default function DynamicSection<T>({
  title,
  subtitle,
  items,
  sectionType = "default",
  renderItem,
  layout = "grid",
  initialDisplayCount = 6,
  maxDisplayCount = 12,
  autoScroll = false,
  autoScrollInterval = 3000,
  resetTimeout = 5000,
  onViewAll,
  onItemClick,
  isLoading = false,
  emptyState,
  className = "",
  mapper,
  showViewAllButton = true,
}: DynamicSectionProps<T>) {
  const [displayCount, setDisplayCount] = useState(initialDisplayCount);
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten and map items to base structure
  const mappedItems: BaseSectionItem[] = items.map((item, index) => {
    if (mapper) {
      return mapper(item);
    }

    const anyItem = item as Record<string, unknown>;

    return {
      id: String(anyItem.id ?? `item-${index}`),
      title: String(anyItem.title ?? anyItem.name ?? "Untitled"),
      subtitle: anyItem.subtitle
        ? String(anyItem.subtitle)
        : anyItem.role
        ? String(anyItem.role)
        : undefined,
      description: anyItem.description
        ? String(anyItem.description)
        : undefined,
      image: anyItem.image
        ? String(anyItem.image)
        : anyItem.avatar
        ? String(anyItem.avatar)
        : undefined,
      imageId: anyItem.imageId ? String(anyItem.imageId) : undefined,
      icon: (anyItem.icon as ReactNode) || undefined,
      metadata: anyItem,
    };
  });

  const hasMore = mappedItems.length > displayCount;
  const isScrollLayout =
    layout === "horizontal-scroll" || layout === "vertical-scroll";

  // Auto-scroll logic for scroll layouts
  useEffect(() => {
    if (!isScrollLayout || !autoScroll || userInteracted || isExpanded) {
      return;
    }

    const container = scrollRef.current;
    if (!container) return;

    autoScrollTimerRef.current = setInterval(() => {
      const isHorizontal = layout === "horizontal-scroll";
      const maxScroll = isHorizontal
        ? container.scrollWidth - container.clientWidth
        : container.scrollHeight - container.clientHeight;
      const currentScroll = isHorizontal
        ? container.scrollLeft
        : container.scrollTop;
      const nextPosition = currentScroll + (isHorizontal ? 200 : 100);

      if (nextPosition >= maxScroll) {
        if (isHorizontal) {
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          container.scrollTo({ top: 0, behavior: "smooth" });
        }
        setScrollPosition(0);
      } else {
        if (isHorizontal) {
          container.scrollTo({ left: nextPosition, behavior: "smooth" });
        } else {
          container.scrollTo({ top: nextPosition, behavior: "smooth" });
        }
        setScrollPosition(nextPosition);
      }
    }, autoScrollInterval);

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [
    layout,
    autoScroll,
    userInteracted,
    isExpanded,
    scrollPosition,
    autoScrollInterval,
    isScrollLayout,
  ]);

  // Handle user scroll interaction
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    setUserInteracted(true);

    const isHorizontal = layout === "horizontal-scroll";
    const scrollPos = isHorizontal ? container.scrollLeft : container.scrollTop;
    const scrollSize = isHorizontal
      ? container.scrollWidth
      : container.scrollHeight;
    const clientSize = isHorizontal
      ? container.clientWidth
      : container.clientHeight;

    if (scrollPos + clientSize >= scrollSize * 0.9) {
      if (displayCount < maxDisplayCount && displayCount < mappedItems.length) {
        setDisplayCount((prev) =>
          Math.min(
            prev + initialDisplayCount,
            maxDisplayCount,
            mappedItems.length
          )
        );
      } else if (displayCount >= maxDisplayCount) {
        setIsExpanded(true);
      }
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      if (isExpanded) {
        setDisplayCount(initialDisplayCount);
        setIsExpanded(false);
        setUserInteracted(false);
        setScrollPosition(0);
        if (container) {
          if (isHorizontal) {
            container.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            container.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      }
    }, resetTimeout);
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    };
  }, []);

  // Section-specific renderers
  const blogRenderer = (item: BaseSectionItem, originalItem: T) => {
    const imageSrc = resolveImageSource(item.image, item.imageId);

    return (
      <Card
        key={item.id}
        variant="elevated"
        hoverable
        className="h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden group"
        onClick={() => onItemClick?.(originalItem)}
      >
        {imageSrc && (
          <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
            <SafeImage
              src={imageSrc}
              alt={item.title}
              width={400}
              height={300}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="text-sm text-indigo-600 font-medium mb-2">
              {item.subtitle}
            </p>
          )}
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-4">
              {item.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
            {getMetadataValue(item.metadata, "date") && (
              <span className="flex items-center gap-1">
                📅{" "}
                {new Date(
                  getMetadataValue(item.metadata, "date")!
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {getMetadataValue(item.metadata, "readTime") && (
              <span>
                ⏱️ {getMetadataValue(item.metadata, "readTime")} min read
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const courseRenderer = (item: BaseSectionItem, originalItem: T) => {
    const imageSrc = resolveImageSource(item.image, item.imageId);
    
    return (
      <Card
        key={item.id}
        variant="elevated"
        hoverable
        className="h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden group"
        onClick={() => onItemClick?.(originalItem)}
      >
        <div className="relative">
          {imageSrc ? (
            <div className="w-full h-44 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden">
              <SafeImage
                src={imageSrc}
                alt={item.title}
                width={400}
                height={250}
                className="w-full h-full object-cover mix-blend-soft-light group-hover:scale-110 transition-transform duration-500"
              />
            </div>
          ) : (
            <div className="w-full h-44 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-6xl text-white/80">📚</span>
            </div>
          )}
          {getMetadataValue(item.metadata, "level") && (
            <span className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 shadow-md">
              {getMetadataValue(item.metadata, "level")}
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="text-sm text-indigo-600 font-medium mb-2">
              {item.subtitle}
            </p>
          )}
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
              {item.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
            {getMetadataValue(item.metadata, "students") && (
              <span className="flex items-center gap-1 text-gray-600">
                <span className="text-sm">👥</span>
                <span className="font-medium">
                  {getMetadataValue(item.metadata, "students")}
                </span>
              </span>
            )}
            {getMetadataValue(item.metadata, "rating") && (
              <span className="flex items-center gap-1 text-amber-600">
                <span>⭐</span>
                <span className="font-semibold">
                  {getMetadataValue(item.metadata, "rating")}
                </span>
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const instructorRenderer = (item: BaseSectionItem, originalItem: T) => {
    const imageSrc = resolveImageSource(item.image, item.imageId);

    return (
      <Card
        key={item.id}
        variant="elevated"
        hoverable
        className="h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
        onClick={() => onItemClick?.(originalItem)}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            {imageSrc ? (
              <div className="relative w-28 h-28 mb-4 rounded-full overflow-hidden border-4 border-indigo-100 group-hover:border-indigo-300 transition-colors shadow-lg">
                <SafeImage
                  src={imageSrc}
                  alt={item.title}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="w-28 h-28 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full mb-4 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <span className="text-4xl font-bold text-white">
                  {item.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-sm text-indigo-600 font-medium mb-2">
                {item.subtitle}
              </p>
            )}
            {item.description && (
              <p className="text-sm text-gray-600 line-clamp-3 mb-4 px-2">
                {item.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600 pt-3 border-t border-gray-100 w-full">
              {getMetadataValue(item.metadata, "courses") && (
                <span className="flex items-center gap-1">
                  <span>📚</span>
                  <span className="font-medium">
                    {getMetadataValue(item.metadata, "courses")}
                  </span>
                </span>
              )}
              {getMetadataValue(item.metadata, "students") && (
                <span className="flex items-center gap-1">
                  <span>👥</span>
                  <span className="font-medium">
                    {getMetadataValue(item.metadata, "students")}
                  </span>
                </span>
              )}
              {getMetadataValue(item.metadata, "rating") && (
                <span className="flex items-center gap-1 text-amber-600">
                  <span>⭐</span>
                  <span className="font-semibold">
                    {getMetadataValue(item.metadata, "rating")}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const userRenderer = (item: BaseSectionItem, originalItem: T) => {
    const imageSrc = resolveImageSource(item.image, item.imageId);
    
    return (
      <Card
        key={item.id}
        variant="elevated"
        hoverable
        className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
        onClick={() => onItemClick?.(originalItem)}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {imageSrc ? (
              <div className="relative flex-shrink-0">
                <SafeImage
                  src={imageSrc}
                  alt={item.title}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-indigo-200 transition-all"
                />
                {getMetadataValue(item.metadata, "isOnline") === "true" && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center flex-shrink-0 group-hover:from-indigo-200 group-hover:to-purple-300 transition-all">
                <span className="text-xl font-bold text-gray-700">
                  {item.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {item.title}
              </h3>
              {item.subtitle && (
                <p className="text-sm text-gray-600 truncate">
                  {item.subtitle}
                </p>
              )}
              {getMetadataValue(item.metadata, "role") && (
                <span className="inline-block mt-2 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                  {getMetadataValue(item.metadata, "role")}
                </span>
              )}
            </div>
          </div>
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-3 pl-[4.5rem]">
              {item.description}
            </p>
          )}
        </div>
      </Card>
    );
  };

  const categoryRenderer = (item: BaseSectionItem, originalItem: T) => {
    const imageSrc = resolveImageSource(item.image, item.imageId);
    
    return (
      <Card
        key={item.id}
        variant="elevated"
        hoverable
        className="h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
        onClick={() => onItemClick?.(originalItem)}
      >
        <div className="p-6 text-center">
          {item.icon ? (
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {item.icon}
            </div>
          ) : imageSrc ? (
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-md">
              <SafeImage
                src={imageSrc}
                alt={item.title}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md">
              <span className="text-3xl">📁</span>
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {item.description}
            </p>
          )}
          {getMetadataValue(item.metadata, "count") && (
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
              {getMetadataValue(item.metadata, "count")} items
            </p>
          )}
        </div>
      </Card>
    );
  };

  const defaultRenderer = (item: BaseSectionItem, originalItem: T) => {
    const imageSrc = resolveImageSource(item.image, item.imageId);
    
    return (
      <Card
        key={item.id}
        variant="elevated"
        hoverable
        className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
        onClick={() => onItemClick?.(originalItem)}
      >
        {imageSrc && (
          <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
            <SafeImage
              src={imageSrc}
              alt={item.title}
              width={400}
              height={200}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        )}
        {item.icon && (
          <div className="flex justify-center text-5xl my-6 group-hover:scale-110 transition-transform">
            {item.icon}
          </div>
        )}
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="text-sm text-indigo-600 font-medium mb-2">
              {item.subtitle}
            </p>
          )}
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {item.description}
            </p>
          )}
        </div>
      </Card>
    );
  };

  // Wrapper for built-in renderers
  const createBuiltInRenderer = (
    renderer: (item: BaseSectionItem, originalItem: T) => ReactNode
  ) => {
    return (item: T, index: number) => {
      const mappedItem = mappedItems[index];
      return renderer(mappedItem, item);
    };
  };

  // Select renderer based on section type
  const getRenderer = (): ((item: T, index: number) => ReactNode) => {
    if (renderItem) return renderItem;

    switch (sectionType) {
      case "blog":
        return createBuiltInRenderer(blogRenderer);
      case "course":
        return createBuiltInRenderer(courseRenderer);
      case "instructor":
        return createBuiltInRenderer(instructorRenderer);
      case "user":
        return createBuiltInRenderer(userRenderer);
      case "category":
        return createBuiltInRenderer(categoryRenderer);
      case "department":
      case "faculty":
      default:
        return createBuiltInRenderer(defaultRenderer);
    }
  };

  const selectedRenderer = getRenderer();

  // Get grid columns based on section type
  const getGridCols = () => {
    switch (sectionType) {
      case "blog":
      case "course":
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case "instructor":
      case "category":
        return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
      case "user":
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    }
  };

  // Get card width for horizontal scroll
  const getScrollItemWidth = () => {
    switch (sectionType) {
      case "blog":
      case "course":
        return "w-80 flex-shrink-0";
      case "instructor":
      case "category":
        return "w-64 flex-shrink-0";
      case "user":
        return "w-96 flex-shrink-0";
      default:
        return "w-80 flex-shrink-0";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className={`py-8 ${className}`}>
        <div className="mb-8">
          <Skeleton variant="text" className="h-8 w-64 mb-2" />
          {subtitle && <Skeleton variant="text" className="h-4 w-96" />}
        </div>
        <div className={`grid ${getGridCols()} gap-6`}>
          {Array.from({ length: layout === "grid" ? 6 : 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="card"
              animation="wave"
              rounded="lg"
              className="h-64"
            />
          ))}
        </div>
      </section>
    );
  }

  // Empty state
  if (mappedItems.length === 0) {
    return (
      <section className={`py-8 ${className}`}>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-600 mt-2 text-lg">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-center justify-center min-h-64 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50">
          {emptyState || (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 font-medium text-lg">
                No items available
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Check back later for updates
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  const showViewAll =
    showViewAllButton &&
    onViewAll &&
    ((layout === "grid" && hasMore) ||
      (isScrollLayout && isExpanded) ||
      mappedItems.length > maxDisplayCount);

  return (
    <section className={`py-8 md:py-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
          {subtitle && <p className="text-gray-600 text-lg">{subtitle}</p>}
        </div>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="px-5 py-2.5 text-indigo-600 hover:text-white hover:bg-indigo-600 border-2 border-indigo-600 rounded-lg transition-all duration-300 font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
          >
            View All →
          </button>
        )}
      </div>

      {/* Grid Layout */}
      {layout === "grid" && (
        <div className={`grid ${getGridCols()} gap-6 md:gap-4 p-2 md:p-1`}>
          {items
            .slice(0, displayCount)
            .map((item, index) => selectedRenderer(item, index))}
        </div>
      )}

      {/* Horizontal Scroll Layout */}
      {layout === "horizontal-scroll" && (
        <div className="relative -mx-4 px-4">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory hide-scrollbar"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style jsx>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {items.slice(0, displayCount).map((item, index) => (
              <div key={index} className={`${getScrollItemWidth()} snap-start`}>
                {selectedRenderer(item, index)}
              </div>
            ))}
            {hasMore && displayCount < maxDisplayCount && (
              <div
                className={`${getScrollItemWidth()} snap-start flex items-center justify-center`}
              >
                <div className="animate-pulse text-indigo-600 text-center">
                  <div className="text-4xl mb-2">⏳</div>
                  <p className="text-sm font-medium">Loading more...</p>
                </div>
              </div>
            )}
          </div>
          {/* Scroll Indicators */}
          {mappedItems.length > 3 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: Math.ceil(mappedItems.length / 3) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === Math.floor(scrollPosition / 300)
                        ? "w-8 bg-indigo-600"
                        : "w-1.5 bg-gray-300"
                    }`}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Vertical Scroll Layout */}
      {layout === "vertical-scroll" && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[700px] overflow-y-auto space-y-4 pr-2 scroll-smooth rounded-lg"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#818cf8 #e0e7ff",
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #e0e7ff;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb {
              background: #818cf8;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #6366f1;
            }
          `}</style>
          {items
            .slice(0, displayCount)
            .map((item, index) => selectedRenderer(item, index))}

          {hasMore && displayCount < maxDisplayCount && (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent" />
                <span className="font-medium">Loading more...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show More Button for Grid Layout */}
      {layout === "grid" && hasMore && displayCount < maxDisplayCount && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() =>
              setDisplayCount((prev) =>
                Math.min(prev + initialDisplayCount, maxDisplayCount)
              )
            }
            className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-300 font-semibold shadow-sm hover:shadow-md"
          >
            Load More
          </button>
        </div>
      )}
    </section>
  );
}

// // ==================== USAGE EXAMPLES ====================

// // Example 1: Blog Posts Section with Grid Layout
// export function BlogPostsSection() {
//   const blogPosts = [
//     {
//       id: "1",
//       title: "Getting Started with React Hooks",
//       author: "John Doe",
//       excerpt:
//         "Learn the fundamentals of React Hooks and how they can simplify your component logic.",
//       image: "/blog/react-hooks.jpg",
//       date: "2024-03-15",
//       readTime: "5",
//       tags: ["React", "JavaScript", "Tutorial"],
//       likes: 156,
//     },
//     {
//       id: "2",
//       title: "Mastering TypeScript in 2024",
//       author: "Jane Smith",
//       excerpt:
//         "Comprehensive guide to TypeScript best practices and advanced patterns.",
//       image: "/blog/typescript.jpg",
//       date: "2024-03-10",
//       readTime: "8",
//       tags: ["TypeScript", "Programming"],
//       likes: 243,
//     },
//     // Add more blog posts...
//   ];

//   return (
//     <DynamicSection
//       title="Latest Articles"
//       subtitle="Stay updated with our latest tutorials and guides"
//       items={blogPosts}
//       sectionType="blog"
//       layout="grid"
//       initialDisplayCount={6}
//       maxDisplayCount={12}
//       mapper={(post) => ({
//         id: post.id,
//         title: post.title,
//         subtitle: `By ${post.author}`,
//         description: post.excerpt,
//         image: post.image,
//         metadata: {
//           date: post.date,
//           readTime: post.readTime,
//           likes: post.likes,
//           tags: post.tags,
//         },
//       })}
//       onItemClick={(post) => console.log("Read article:", post.title)}
//       onViewAll={() => console.log("View all blog posts")}
//       showViewAllButton={true}
//     />
//   );
// }

// // Example 2: Featured Courses with Horizontal Scroll
// export function FeaturedCoursesSection() {
//   const courses = [
//     {
//       id: "1",
//       title: "Complete Web Development Bootcamp",
//       instructor: "Angela Yu",
//       description:
//         "Learn web development from scratch with HTML, CSS, JavaScript, Node, React, MongoDB and more!",
//       thumbnail: "/courses/web-dev.jpg",
//       level: "Beginner",
//       students: "125,430",
//       rating: "4.8",
//       price: "$89.99",
//     },
//     {
//       id: "2",
//       title: "Advanced React and Redux",
//       instructor: "Stephen Grider",
//       description:
//         "Master React and Redux with this comprehensive course covering hooks, context, and advanced patterns.",
//       thumbnail: "/courses/react-redux.jpg",
//       level: "Advanced",
//       students: "89,200",
//       rating: "4.9",
//       price: "$79.99",
//     },
//     // Add more courses...
//   ];

//   return (
//     <DynamicSection
//       title="Featured Courses"
//       subtitle="Hand-picked courses to boost your career"
//       items={courses}
//       sectionType="course"
//       layout="horizontal-scroll"
//       autoScroll={true}
//       autoScrollInterval={4000}
//       initialDisplayCount={8}
//       maxDisplayCount={15}
//       mapper={(course) => ({
//         id: course.id,
//         title: course.title,
//         subtitle: `with ${course.instructor}`,
//         description: course.description,
//         image: course.thumbnail,
//         metadata: {
//           level: course.level,
//           students: course.students,
//           rating: course.rating,
//           price: course.price,
//         },
//       })}
//       onItemClick={(course) => console.log("Enroll in:", course.title)}
//       onViewAll={() => console.log("Browse all courses")}
//     />
//   );
// }

// // Example 3: Top Instructors Grid
// export function TopInstructorsSection() {
//   const instructors = [
//     {
//       id: "1",
//       name: "Dr. Sarah Johnson",
//       role: "Computer Science Professor",
//       bio: "PhD in AI/ML with 15 years of teaching experience. Specializes in machine learning and data science.",
//       avatar: "/instructors/sarah.jpg",
//       courses: "12",
//       students: "45,000",
//       rating: "4.9",
//     },
//     {
//       id: "2",
//       name: "Michael Chen",
//       role: "Senior Software Engineer",
//       bio: "Former Google engineer teaching practical software development and system design.",
//       avatar: "/instructors/michael.jpg",
//       courses: "8",
//       students: "32,500",
//       rating: "4.8",
//     },
//     // Add more instructors...
//   ];

//   return (
//     <DynamicSection
//       title="Meet Our Instructors"
//       subtitle="Learn from industry experts and educators"
//       items={instructors}
//       sectionType="instructor"
//       layout="grid"
//       initialDisplayCount={5}
//       maxDisplayCount={15}
//       mapper={(instructor) => ({
//         id: instructor.id,
//         title: instructor.name,
//         subtitle: instructor.role,
//         description: instructor.bio,
//         image: instructor.avatar,
//         metadata: {
//           courses: instructor.courses,
//           students: instructor.students,
//           rating: instructor.rating,
//         },
//       })}
//       onItemClick={(instructor) =>
//         console.log("View profile:", instructor.name)
//       }
//       onViewAll={() => console.log("View all instructors")}
//     />
//   );
// }

// // Example 4: Active Users with Vertical Scroll
// export function ActiveUsersSection() {
//   const activeUsers = [
//     {
//       id: "1",
//       username: "alex_developer",
//       displayName: "Alex Martinez",
//       role: "Premium Member",
//       bio: "Full-stack developer passionate about clean code and best practices.",
//       avatar: "/users/alex.jpg",
//       isOnline: true,
//     },
//     {
//       id: "2",
//       username: "emily_designer",
//       displayName: "Emily Roberts",
//       role: "Pro Member",
//       bio: "UI/UX designer creating beautiful and functional user experiences.",
//       avatar: "/users/emily.jpg",
//       isOnline: true,
//     },
//     // Add more users...
//   ];

//   return (
//     <DynamicSection
//       title="Active Community Members"
//       subtitle="Connect with members currently online"
//       items={activeUsers}
//       sectionType="user"
//       layout="vertical-scroll"
//       autoScroll={true}
//       autoScrollInterval={3000}
//       resetTimeout={10000}
//       initialDisplayCount={6}
//       maxDisplayCount={20}
//       mapper={(user) => ({
//         id: user.id,
//         title: user.displayName,
//         subtitle: `@${user.username}`,
//         description: user.bio,
//         image: user.avatar,
//         metadata: {
//           role: user.role,
//           isOnline: user.isOnline.toString(),
//         },
//       })}
//       onItemClick={(user) => console.log("View profile:", user.displayName)}
//       showViewAllButton={false}
//     />
//   );
// }

// // Example 5: Course Categories Grid
// export function CourseCategoriesSection() {
//   const categories = [
//     {
//       id: "1",
//       name: "Web Development",
//       description: "HTML, CSS, JavaScript, React, Node.js and more",
//       icon: "💻",
//       count: 234,
//     },
//     {
//       id: "2",
//       name: "Data Science",
//       description: "Python, Machine Learning, AI, Analytics",
//       icon: "📊",
//       count: 156,
//     },
//     {
//       id: "3",
//       name: "Mobile Development",
//       description: "iOS, Android, React Native, Flutter",
//       icon: "📱",
//       count: 189,
//     },
//     {
//       id: "4",
//       name: "Cloud Computing",
//       description: "AWS, Azure, Google Cloud, DevOps",
//       icon: "☁️",
//       count: 145,
//     },
//     // Add more categories...
//   ];

//   return (
//     <DynamicSection
//       title="Explore Categories"
//       subtitle="Find the perfect course for your learning goals"
//       items={categories}
//       sectionType="category"
//       layout="grid"
//       initialDisplayCount={8}
//       mapper={(category) => ({
//         id: category.id,
//         title: category.name,
//         description: category.description,
//         icon: <span>{category.icon}</span>,
//         metadata: {
//           count: category.count.toString(),
//         },
//       })}
//       onItemClick={(category) => console.log("Browse:", category.name)}
//       onViewAll={() => console.log("View all categories")}
//     />
//   );
// }

// // Example 6: Latest Blog Posts with Horizontal Scroll
// export function LatestBlogsHorizontal() {
//   const recentBlogs = [
//     {
//       id: "1",
//       title: "10 JavaScript Tips Every Developer Should Know",
//       author: "David Kim",
//       excerpt:
//         "Boost your JavaScript skills with these essential tips and tricks.",
//       coverImage: "/blog/js-tips.jpg",
//       publishedAt: "2024-03-20",
//       readTime: "6",
//     },
//     // Add more blogs...
//   ];

//   return (
//     <DynamicSection
//       title="Recent Posts"
//       subtitle="Fresh content from our community"
//       items={recentBlogs}
//       sectionType="blog"
//       layout="horizontal-scroll"
//       autoScroll={false}
//       initialDisplayCount={10}
//       mapper={(blog) => ({
//         id: blog.id,
//         title: blog.title,
//         subtitle: `By ${blog.author}`,
//         description: blog.excerpt,
//         image: blog.coverImage,
//         metadata: {
//           date: blog.publishedAt,
//           readTime: blog.readTime,
//         },
//       })}
//       onItemClick={(blog) => console.log("Read:", blog.title)}
//       onViewAll={() => console.log("View all blogs")}
//     />
//   );
// }

// // Example 7: Custom Renderer - Testimonials
// export function TestimonialsSection() {
//   const testimonials = [
//     {
//       id: "1",
//       name: "Rachel Green",
//       role: "Software Engineer at Google",
//       quote: "This platform transformed my career. The courses are top-notch!",
//       avatar: "/testimonials/rachel.jpg",
//       rating: 5,
//     },
//     {
//       id: "2",
//       name: "Ross Geller",
//       role: "Data Scientist at Amazon",
//       quote: "Best investment I made in my professional development.",
//       avatar: "/testimonials/ross.jpg",
//       rating: 5,
//     },
//     // Add more testimonials...
//   ];

//   return (
//     <DynamicSection
//       title="What Our Students Say"
//       subtitle="Real feedback from real students"
//       items={testimonials}
//       layout="horizontal-scroll"
//       initialDisplayCount={6}
//       renderItem={(testimonial) => (
//         <Card
//           key={testimonial.id}
//           variant="elevated"
//           className="w-96 h-full p-6 bg-gradient-to-br from-indigo-50 to-purple-50"
//         >
//           <div className="flex items-center gap-4 mb-4">
//             <Image
//               src={testimonial.avatar}
//               alt={testimonial.name}
//               width={56}
//               height={56}
//               className="w-14 h-14 rounded-full object-cover"
//             />
//             <div>
//               <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
//               <p className="text-sm text-gray-600">{testimonial.role}</p>
//             </div>
//           </div>
//           <div className="flex gap-1 mb-3">
//             {Array.from({ length: testimonial.rating }).map((_, i) => (
//               <span key={i} className="text-amber-500">
//                 ⭐
//               </span>
//             ))}
//           </div>
//           <p className="text-gray-700 italic">"{testimonial.quote}"</p>
//         </Card>
//       )}
//       onViewAll={() => console.log("View all testimonials")}
//     />
//   );
// }

// // Example 8: Complete Homepage Layout
// export default function HomePage() {
//   return (
//     <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         {/* Hero Section */}
//         <div className="text-center mb-16">
//           <h1 className="text-5xl font-bold text-gray-900 mb-4">
//             Welcome to Your Learning Platform
//           </h1>
//           <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//             Discover thousands of courses, connect with expert instructors, and
//             accelerate your career.
//           </p>
//         </div>

//         {/* Content Sections */}
//         <div className="space-y-16">
//           <FeaturedCoursesSection />
//           <BlogPostsSection />
//           <TopInstructorsSection />
//           <CourseCategoriesSection />
//           <ActiveUsersSection />
//           <TestimonialsSection />
//           <LatestBlogsHorizontal />
//         </div>
//       </div>
//     </div>
//   );
// }
