// Shared formatting helpers so money/date/status strings are produced in one
// place instead of being re-implemented inside every page.

/** Currency symbol for the app. Change this one line to switch notation. */
export const CURRENCY_SYMBOL = "Rs.";

// Two fixed decimals with stable grouping, so amounts render identically in
// every browser/locale ("Rs. 1,250.00") instead of relying on local defaults.
const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a numeric or string amount in Nepali Rupees, e.g. "Rs. 1,250.00". */
export const formatCurrency = (value: string | number): string =>
  `${CURRENCY_SYMBOL} ${amountFormatter.format(Number(value))}`;

/** Formats an ISO timestamp using the visitor's locale. */
export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString();

/** Turns an enum-style status ("READY_FOR_PICKUP") into readable text. */
export const humanizeStatus = (status: string): string =>
  status.replaceAll("_", " ").toLowerCase();

/** Customer-facing labels for order statuses. */
export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PREPARING: "In the kitchen",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};