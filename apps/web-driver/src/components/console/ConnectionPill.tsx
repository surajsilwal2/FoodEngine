export type OfferFeedStatus = "live" | "connecting" | "offline";

const STATES: Record<
  OfferFeedStatus,
  { label: string; className: string; dot: string }
> = {
  live: {
    label: "Offers live",
    className: "bg-success/10 text-success",
    dot: "bg-success animate-pulse",
  },
  connecting: {
    label: "Reconnecting…",
    className: "bg-warning/10 text-warning",
    dot: "bg-warning animate-pulse",
  },
  offline: {
    label: "Offers offline",
    className: "bg-surface-muted text-ink-muted",
    dot: "bg-ink-muted",
  },
};

/**
 * Real offer-feed health. A driver who has lost the socket is not receiving
 * work, so this reports the connection instead of a decorative badge.
 */
export default function ConnectionPill({
  status,
}: {
  status: OfferFeedStatus;
}) {
  const { label, className, dot } = STATES[status];

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
