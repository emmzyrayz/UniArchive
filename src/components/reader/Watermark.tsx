// components/reader/Watermark.tsx
export function Watermark({ label }: { label: string }) {
  const tiles = Array.from({ length: 24 });

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden
    >
      <div className="grid grid-cols-4 gap-16 -rotate-[30deg] scale-125 origin-center absolute inset-0 -m-16">
        {tiles.map((_, i) => (
          <span
            key={i}
            className="text-white/[0.06] text-sm font-medium whitespace-nowrap"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
