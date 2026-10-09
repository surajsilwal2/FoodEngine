import type { MerchantOrder } from "@/types/orders";

/** The three cook-line stages a ticket can sit in on the kitchen board. */
export type LaneKey = "NEW" | "PREP" | "READY";

export type LaneAccent = "brand" | "success" | "accent";

export interface Lane {
  key: LaneKey;
  title: string;
  /** Static description of what the stage means — never a fabricated metric. */
  subtitle: string;
  /** Order statuses shown in this lane. */
  statuses: string[];
  accent: LaneAccent;
  /** Chip shown on the ticket, e.g. "#2041 NEW". */
  ticketLabel: string;
}

/**
 * Cook-line lanes, in the order the kitchen works them. PICKED_UP tickets stay
 * in the handoff lane until the order completes so the desk can still see that
 * the food has physically left the shelf.
 */
export const KDS_LANES: Lane[] = [
  {
    key: "NEW",
    title: "New Orders",
    subtitle: "Paid, waiting to start",
    statuses: ["CONFIRMED"],
    accent: "brand",
    ticketLabel: "NEW",
  },
  {
    key: "PREP",
    title: "In Preparation",
    subtitle: "On the cook line",
    statuses: ["PREPARING"],
    accent: "success",
    ticketLabel: "ON TRACK",
  },
  {
    key: "READY",
    title: "Ready For Pickup",
    subtitle: "Courier handoff",
    statuses: ["READY_FOR_PICKUP", "PICKED_UP"],
    accent: "accent",
    ticketLabel: "HANDOFF",
  },
];

export const LANE_ACCENT_CLASSES: Record<
  LaneAccent,
  { dot: string; chip: string; text: string }
> = {
  brand: {
    dot: "bg-brand",
    chip: "bg-brand-soft text-brand",
    text: "text-brand",
  },
  success: {
    dot: "bg-success",
    chip: "bg-success/10 text-success",
    text: "text-success",
  },
  accent: {
    dot: "bg-accent",
    chip: "bg-accent-soft text-accent",
    text: "text-accent",
  },
};

export type DeliveryTone = "neutral" | "accent" | "success" | "danger";

/**
 * Describes where the order's delivery actually stands, using only states the
 * backend records. There is no courier PIN or shelf code in FoodEngine, so the
 * handoff lane names the driver instead of inventing either.
 */
export function describeDelivery(order: MerchantOrder): {
  label: string;
  tone: DeliveryTone;
} {
  const delivery = order.delivery;
  if (!delivery) return { label: "No delivery record", tone: "neutral" };

  switch (delivery.status) {
    case "SEARCHING":
      return { label: "Matching driver", tone: "accent" };
    case "ASSIGNED":
      return { label: "Courier assigned", tone: "accent" };
    case "PICKED_UP":
      return { label: "Out for delivery", tone: "success" };
    case "FAILED":
      return { label: "Driver search failed", tone: "danger" };
    case "CANCELLED":
      return { label: "Delivery cancelled", tone: "neutral" };
    default:
      return { label: delivery.status.replaceAll("_", " ").toLowerCase(), tone: "neutral" };
  }
}

/** The accepting driver, once one exists. */
export function courierOf(order: MerchantOrder) {
  return order.delivery?.driver ?? null;
}

export const DELIVERY_TONE_CLASSES: Record<DeliveryTone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
};
