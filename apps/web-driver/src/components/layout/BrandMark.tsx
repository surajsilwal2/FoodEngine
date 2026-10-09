import { Zap } from "lucide-react";

/**
 * The FoodEngine lockup: an accent tile, the wordmark with the second half in
 * brand colour, and an optional role chip.
 */
export default function BrandMark({ role }: { role?: string }) {
  return (
    <>
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-white"
        aria-hidden="true"
      >
        <Zap className="size-4" />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-ink">
        Food<span className="text-brand">Engine</span>
      </span>
      {role && (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold text-ink-muted">
          {role}
        </span>
      )}
    </>
  );
}
