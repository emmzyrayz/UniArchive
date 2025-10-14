import { Button } from "@/components/UI";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  showInfo?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  showPageNumbers = true,
  showInfo = true,
  className = "",
}: PaginationProps) {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  const startItem = totalItems ? (currentPage - 1) * (pageSize || 10) + 1 : 0;
  const endItem = totalItems
    ? Math.min(currentPage * (pageSize || 10), totalItems)
    : 0;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Page Info */}
      {showInfo && totalItems && (
        <div className="hidden sm:block">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalItems.toLocaleString()}</span>{" "}
            results
          </p>
        </div>
      )}

      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <Button
          variant="outline"
          //   size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="text-sm"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          }
          iconPosition="left"
          label={showPageNumbers ? "Previous" : undefined}
        />

        {/* Page Numbers */}
        {showPageNumbers &&
          visiblePages.map((page, index) => (
            <div key={index}>
              {page === "..." ? (
                <span className="px-3 py-2 text-sm text-gray-500">...</span>
              ) : (
                <Button
                  variant={page === currentPage ? "primary" : "outline"}
                  //   size="sm"
                  onClick={() => onPageChange(page as number)}
                  label={page.toString()}
                  className="min-w-[40px] text-sm"
                />
              )}
            </div>
          ))}

        {/* Next Button */}
        <Button
          variant="outline"
          //   size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="text-sm"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          }
          iconPosition="right"
          label={showPageNumbers ? "Next" : undefined}
        />
      </div>

      {/* Mobile Info */}
      {showInfo && totalItems && (
        <div className="sm:hidden text-sm text-gray-700">
          {currentPage} of {totalPages}
        </div>
      )}
    </div>
  );
}
