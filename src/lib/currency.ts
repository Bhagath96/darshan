const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Formats whole rupees with Indian digit grouping, e.g. 110 → "₹110", 125000 → "₹1,25,000". */
export function formatINR(amount: number): string {
  return inr.format(amount)
}
