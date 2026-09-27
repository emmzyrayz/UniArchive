// components/unilibrary/MaterialCardSkeleton.tsx
// Placeholder with the MaterialCard's shape while the feed loads.
const BLOCK = "rounded bg-neutral-200 dark:bg-neutral-700";

export function MaterialCardSkeleton() {
  return (
    <div
      aria-hidden
      className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5"
    >
      <div className="flex justify-between">
        <div className={`${BLOCK} h-5 w-16 rounded-full`} />
        <div className={`${BLOCK} h-5 w-20 rounded-full`} />
      </div>
      <div className={`${BLOCK} mt-4 h-5 w-3/4`} />
      <div className={`${BLOCK} mt-2 h-3 w-1/3`} />
      <div className={`${BLOCK} mt-4 h-3 w-full`} />
      <div className={`${BLOCK} mt-2 h-3 w-5/6`} />
      <div className={`${BLOCK} mt-4 h-3 w-1/2`} />
      <div className={`${BLOCK} mt-2 h-3 w-2/5`} />
      <div className="mt-4 flex items-end justify-between">
        <div className="flex gap-1.5">
          <div className={`${BLOCK} h-5 w-12 rounded-full`} />
          <div className={`${BLOCK} h-5 w-14 rounded-full`} />
        </div>
        <div className={`${BLOCK} h-9 w-20 rounded-lg`} />
      </div>
    </div>
  );
}
