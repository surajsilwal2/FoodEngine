"use client";

import Button from "@/components/ui/Button";

/**
 * Catches render and data errors for the whole app so a failure never leaves a
 * merchant staring at a blank page.
 */
export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-16">
      <section className="w-full max-w-md rounded-card bg-surface p-6 shadow-e1">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          We couldn&apos;t load this page. Please try again — if it keeps
          happening, contact support.
        </p>
        <Button className="mt-5" onClick={props.reset}>
          Try again
        </Button>
      </section>
    </main>
  );
}
