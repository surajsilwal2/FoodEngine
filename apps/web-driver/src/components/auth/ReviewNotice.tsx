"use client";

import { Clock3 } from "lucide-react";
import Card from "@/components/ui/Card";

/** Shown between submitting an application and being approved. */
export default function ReviewNotice() {
  return (
    <Card className="mx-auto mt-8 flex w-full max-w-2xl items-start gap-4 p-6">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent"
        aria-hidden="true"
      >
        <Clock3 className="size-5" />
      </span>
      <div>
        <h1 className="text-xl font-bold">Application under review</h1>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Your driver profile is waiting for administrator approval. Delivery
          offers will appear here as soon as it is approved.
        </p>
      </div>
    </Card>
  );
}
