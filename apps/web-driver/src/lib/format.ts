const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats backend amounts the same way the customer receipts and the merchant
 * desk do. The console previously rendered dollars while the rest of the suite
 * billed in rupees.
 */
export function formatCurrency(value: string | number): string {
  return `Rs. ${amountFormatter.format(Number(value))}`;
}
