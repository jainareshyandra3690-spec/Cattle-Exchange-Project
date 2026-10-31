/**
 * Cattle Exchange — Standardized Domain Formatters
 * Formats Indian livestock metrics according to Phase 0 specifications.
 */

/**
 * Formats an integer price in whole Indian Rupees (INR) using Indian numbering system separators.
 * Example: 85000 -> "₹85,000", 1250000 -> "₹12,50,000"
 */
export function formatINR(price: number): string {
  if (typeof price !== "number" || isNaN(price) || price < 0) {
    return "₹0";
  }

  // Format as whole rupees without decimals using Indian locale
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.floor(price));
}

/**
 * Formats milk yield in liters per day.
 * Returns null if the value is null, undefined, or not applicable (e.g. bulls, calves).
 */
export function formatMilkYield(liters: number | null | undefined): string | null {
  if (liters === null || liters === undefined || isNaN(liters) || liters <= 0) {
    return null;
  }
  return `${liters} L/day`;
}

/**
 * Formats animal age in months into a human-readable string.
 * Example: 36 -> "36 mos", null -> "Age: Not specified"
 */
export function formatAge(months: number | null | undefined): string {
  if (months === null || months === undefined || isNaN(months) || months < 0) {
    return "Age: Not specified";
  }

  if (months < 12) {
    return `${months} mos`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? "yr" : "yrs"}`;
  }

  return `${years} yr ${remainingMonths} mo`;
}

