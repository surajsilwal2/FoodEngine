export type StatusTone =
  | "neutral"
  | "progress"
  | "success"
  | "warning"
  | "danger";

// Semantic tones only — no generic gray pills, and never colour alone.
const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  progress: "bg-brand-soft text-brand",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-ink-muted",
  progress: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/**
 * Small status chip. The caller supplies the label and tone explicitly, which
 * keeps the wording next to the screen that owns it.
 */
export default function StatusBadge({
  label,
  tone = "neutral",
  className = "",
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      <span
        className={`size-1.5 rounded-full ${DOT_CLASSES[tone]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
