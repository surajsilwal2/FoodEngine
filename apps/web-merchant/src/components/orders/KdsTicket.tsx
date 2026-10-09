"use client";

import React from "react";
import { Bike } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { cardClasses } from "@/components/ui/Card";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { formatCurrency } from "@/lib/format";
import {
  courierOf,
  DELIVERY_TONE_CLASSES,
  describeDelivery,
  LANE_ACCENT_CLASSES,
  type Lane,
} from "@/lib/orderLanes";
import type { MerchantOrder } from "@/types/orders";

/**
 * A single kitchen ticket: who it is for, what to cook, how long it has been on
 * the line, and where its delivery stands. Actions are supplied by the desk so
 * the ticket stays presentational.
 */
export default function KdsTicket({
  order,
  lane,
  actions,
}: {
  order: MerchantOrder;
  lane: Lane;
  actions?: React.ReactNode;
}) {
  const { label: elapsed, isOverdue } = useElapsedTime(order.createdAt);
  const delivery = describeDelivery(order);
  const courier = courierOf(order);
  const accent = LANE_ACCENT_CLASSES[lane.accent];

  return (
    <article className={`${cardClasses} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${accent.chip}`}
          >
            #{order.id} {lane.ticketLabel}
          </span>
          <h3 className="mt-1.5 truncate text-base font-bold text-ink">
            {order.customer.name}
          </h3>
        </div>
        {/* Time on the line, measured from the order's own timestamp. */}
        <span
          title="Time since the order was placed"
          className={`shrink-0 font-mono text-sm font-bold ${
            isOverdue ? "text-danger" : "text-ink-muted"
          }`}
        >
          {elapsed}
        </span>
      </div>

      <ul className="mt-4 space-y-2 border-y border-line-soft py-3 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4">
            <span className="min-w-0 font-semibold text-ink">
              {item.quantity}× {item.snapshotName}
            </span>
            <span className="shrink-0 font-medium text-ink-muted">
              {formatCurrency(Number(item.unitPrice) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${DELIVERY_TONE_CLASSES[delivery.tone]}`}
        >
          {delivery.label}
        </span>
        <span className="text-sm font-bold text-ink">
          {formatCurrency(order.total)}
        </span>
      </div>

      {/* Who is collecting the food, once a driver has accepted. */}
      {courier && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <Bike className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate">
            Courier: {courier.user.name} ({courier.vehicleDetails})
          </span>
        </p>
      )}

      {order.delivery?.status === "FAILED" &&
        ["PREPARING", "READY_FOR_PICKUP"].includes(order.status) && (
          <Alert className="mt-4 text-xs">
            Driver search needs attention. The order is still on your line —
            retry matching or arrange another pickup.
          </Alert>
        )}

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
