import React from "react";

/** Shared text-input styling so every driver form field looks the same. */
export const inputClasses =
  "w-full rounded-control border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-surface-muted";

/**
 * A labelled form field. The label stays visible rather than relying on a
 * placeholder, and `hint` carries format guidance underneath.
 */
export default function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactElement;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
