/** A single placeholder block used while data is loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-surface-muted ${className}`}
    />
  );
}

/** Mirrors the restaurant card grid so loading keeps the page's structure. */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-line bg-surface p-5 shadow-e1">
          <Skeleton className="size-10 rounded-control" />
          <Skeleton className="mt-5 h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-6 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
