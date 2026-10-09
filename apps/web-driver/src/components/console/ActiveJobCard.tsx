"use client";

import { Check, CookingPot, PackageCheck, PackageOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { ActiveDelivery } from "@/lib/queries";

/**
 * The job the driver is working right now: where to go, what to collect, and
 * the one action that advances it. Distances are real straight-line values —
 * FoodEngine has no routing service, so no ETA or fare is invented here.
 */
export default function ActiveJobCard({
  delivery,
  distanceLabel,
  isBusy,
  onAdvance,
}: {
  delivery: ActiveDelivery;
  distanceLabel: string | null;
  isBusy: boolean;
  onAdvance: () => void;
}) {
  const isPickingUp = delivery.status === "ASSIGNED";
  const itemCount = delivery.order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <Card className="border-brand/40 bg-brand-soft/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
          {isPickingUp ? "On route to pickup" : "Delivering to customer"}
        </span>
        {distanceLabel && (
          <span className="font-mono text-xs font-bold text-ink-muted">
            {distanceLabel} away
          </span>
        )}
      </div>

      <h2 className="mt-3 truncate text-lg font-extrabold text-ink">
        {isPickingUp
          ? delivery.order.restaurant.name
          : delivery.order.customer.name}
      </h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        {isPickingUp
          ? delivery.order.restaurant.location
          : (delivery.order.deliveryAddress ?? "Delivery address unavailable")}
      </p>

      {/* The kitchen's own state, so the driver knows whether to wait. */}
      {isPickingUp && delivery.order.status === "PREPARING" && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
          <CookingPot className="size-3.5" aria-hidden="true" />
          Kitchen preparing — not ready to collect yet
        </span>
      )}
      {isPickingUp && delivery.order.status === "READY_FOR_PICKUP" && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
          <PackageOpen className="size-3.5" aria-hidden="true" />
          Ready for pickup at the counter
        </span>
      )}

      <div className="mt-4 border-t border-line-soft pt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-ink-muted">Order #{delivery.order.id}</span>
          <span className="font-bold text-ink">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {delivery.order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded bg-surface-muted text-xs font-bold text-ink">
                {item.quantity}
              </span>
              <span className="truncate text-ink">{item.snapshotName}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant={isPickingUp ? "success" : "primary"}
        className="mt-4 w-full"
        disabled={isBusy}
        onClick={onAdvance}
      >
        {isPickingUp ? (
          <>
            <Check className="size-4" aria-hidden="true" />
            {isBusy ? "Updating…" : "Confirm pickup"}
          </>
        ) : (
          <>
            <PackageCheck className="size-4" aria-hidden="true" />
            {isBusy ? "Updating…" : "Mark delivered"}
          </>
        )}
      </Button>
    </Card>
  );
}
