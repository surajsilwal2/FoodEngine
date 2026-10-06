const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats backend amounts in the same Nepali Rupee notation as customer receipts. */
export function formatCurrency(value: string | number): string {
  return `Rs. ${amountFormatter.format(Number(value))}`;
}

/** Formats order timestamps using the merchant's browser locale. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

/** Turns enum values into labels suitable for compact status controls. */
export function humanizeStatus(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}