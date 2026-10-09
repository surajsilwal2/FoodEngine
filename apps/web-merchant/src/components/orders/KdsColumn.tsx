import React from "react";
import { LANE_ACCENT_CLASSES, type Lane } from "@/lib/orderLanes";

/**
 * One cook-line lane. The lane owns a single accent colour so the three columns
 * read as a sequence (orange → green → blue) instead of a wall of one accent.
 */
export default function KdsColumn({
  lane,
  count,
  emptyMessage,
  children,
}: {
  lane: Lane;
  count: number;
  emptyMessage: string;
  children?: React.ReactNode;
}) {
  const accent = LANE_ACCENT_CLASSES[lane.accent];
  const headingId = `kds-lane-${lane.key}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`size-2.5 shrink-0 rounded-full ${accent.dot}`}
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="truncate text-sm font-bold uppercase tracking-wide text-ink"
          >
            {lane.title}
          </h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${accent.chip}`}
          >
            {count}
          </span>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-ink-muted sm:inline">
          {lane.subtitle}
        </span>
      </div>

      {count === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
          {emptyMessage}
        </p>
      ) : (
        <div className="flex flex-col gap-4">{children}</div>
      )}
    </section>
  );
}
