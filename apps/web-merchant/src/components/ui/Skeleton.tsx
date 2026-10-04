/** A single placeholder block used while data is loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-surface-muted ${className}`}
    />
  );
}
