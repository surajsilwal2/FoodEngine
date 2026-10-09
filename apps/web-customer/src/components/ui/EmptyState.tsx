import React from "react";

/**
 * Centered empty/no-results block. Uses whitespace instead of a dashed border
 * box so empty states stay calm rather than decorative.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="grid size-12 place-items-center rounded-control bg-surface-muted text-ink-muted">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-bold tracking-tight text-ink">
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
