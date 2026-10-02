import React from "react";

type AlertTone = "danger" | "warning";

const TONE_CLASSES: Record<AlertTone, string> = {
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
};

/** Inline message surface for errors and warnings. */
export default function Alert({
  tone = "danger",
  className = "",
  children,
}: {
  tone?: AlertTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      role="alert"
      className={`rounded-control px-3.5 py-3 text-sm font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </p>
  );
}
