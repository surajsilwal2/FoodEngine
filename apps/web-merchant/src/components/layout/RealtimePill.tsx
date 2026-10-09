"use client";

import { useRealtimeStatus, type RealtimeStatus } from "@/hooks/useRealtimeStatus";

/**
 * Copy and colour per realtime state. "Live sync" means the socket is carrying
 * restaurant events; anything else means the desk is on its polling fallback.
 */
const STATES: Record<
  RealtimeStatus,
  { label: string; className: string; dot: string }
> = {
  live: {
    label: "Live sync",
    className: "bg-success/10 text-success",
    dot: "bg-success animate-pulse",
  },
  connecting: {
    label: "Reconnecting…",
    className: "bg-warning/10 text-warning",
    dot: "bg-warning animate-pulse",
  },
  offline: {
    label: "Polling only",
    className: "bg-surface-muted text-ink-muted",
    dot: "bg-ink-muted",
  },
};

/**
 * Truthful replacement for a decorative "network live" chip: it reflects the
 * socket the order desk is actually subscribed to.
 */
export default function RealtimePill() {
  const status = useRealtimeStatus();
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
