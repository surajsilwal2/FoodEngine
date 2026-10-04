import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Route-level placeholder. Next.js renders this while a route segment is being
 * prepared, which stops the browser painting a blank frame during navigation.
 */
export default function Loading() {
  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-72" />
        <Skeleton className="mt-8 h-40 rounded-card" />
      </div>
    </main>
  );
}
