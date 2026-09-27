// components/unilibrary/UniLibraryEmptyState.tsx
// Shown when the feed has nothing for the current filters (or at all).
import Link from "next/link";

interface Props {
  filtersActive: boolean;
  isAuthenticated: boolean;
  onClearFilters?: () => void;
}

export function UniLibraryEmptyState({ filtersActive, isAuthenticated, onClearFilters }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-raised px-6 py-14 text-center">
      <div className="text-4xl" aria-hidden>
        📚
      </div>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">No materials here yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
        {filtersActive
          ? "No materials match your filters. Try broadening your search."
          : "Be the first to contribute to the UniLibrary. Upload your notes, past questions, or textbooks and submit them for review."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {filtersActive && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface"
          >
            Clear filters
          </button>
        )}
        {isAuthenticated ? (
          <Link
            href="/upload"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Upload a document
          </Link>
        ) : (
          <Link
            href="/auth?view=signin&from=%2Fupload"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Sign in to contribute
          </Link>
        )}
      </div>
    </div>
  );
}
