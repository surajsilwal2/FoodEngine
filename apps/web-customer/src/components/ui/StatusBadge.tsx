import { STATUS_LABELS } from "@/lib/format";

type Tone = "neutral" | "progress" | "success" | "warning" | "danger";

// Semantic tones only — no generic gray status pills.
const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  progress: "bg-brand-soft text-brand",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-ink-muted",
  progress: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const STATUS_TONES: Record<string, Tone> = {
  PENDING: "warning",
  CONFIRMED: "progress",
  PREPARING: "progress",
  READY_FOR_PICKUP: "progress",
  PICKED_UP: "progress",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export default function StatusBadge({
  status,
  label,
  tone,
  className = "",
}: {
  /** A known status key (order lifecycle). Derives the label and tone. */
  status?: string;
  /** Explicit label, for statuses outside the order lifecycle. */
  label?: string;
  /** Explicit tone, for statuses outside the order lifecycle. */
  tone?: Tone;
  className?: string;
}) {
  const resolvedTone = tone ?? STATUS_TONES[status ?? ""] ?? "neutral";
  const resolvedLabel =
    label ??
    STATUS_LABELS[status ?? ""] ??
    (status ?? "").replaceAll("_", " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[resolvedTone]} ${className}`}
    >
      <span
        className={`size-1.5 rounded-full ${DOT_CLASSES[resolvedTone]}`}
        aria-hidden="true"
      />
      {resolvedLabel}
    </span>
  );
}
