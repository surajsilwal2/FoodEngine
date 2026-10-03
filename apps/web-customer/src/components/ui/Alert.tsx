import React from "react";

type AlertTone = "danger" | "warning" | "success";

const TONE_CLASSES: Record<AlertTone, string> = {
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
};

/** Inline message surface for errors, warnings and confirmations. */
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
      // Success is an announcement, not an error, so it gets the status role.
      role={tone === "success" ? "status" : "alert"}
      className={`rounded-control px-3.5 py-3 text-sm font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </p>
  );
}
