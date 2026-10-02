import { GridSkeleton, Skeleton } from "@/components/ui/Skeleton";

/**
 * Route-level loading UI. Next.js shows this while a route segment is being
 * prepared, which removes the blank/white frame the browser would otherwise
 * paint during navigation.
 */
export default function Loading() {
  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-6 h-12 w-full max-w-xl" />
        <div className="mt-8">
          <GridSkeleton count={3} />
        </div>
      </div>
    </main>
  );
}
