// Maps config country code to the Intl locale tag used for number formatting.
// en-PK gives "Rs 1,000" (no decimals); "en" with SAR gives "SAR 1,000.00".
const COUNTRY_LOCALE_TAG = { PK: "en-PK", SA: "en" };

/**
 * Format a monetary value using the given currency/country config.
 * Pure function — safe to call in any context (React, PDF utils, stores).
 *
 * Amounts are always stored in PKR. When displaying in a non-PKR currency,
 * multiply by exchangeRate for display only — no stored values are mutated.
 *
 * @param {number} n - Base amount in PKR
 * @param {{ currency?: string, country?: string, exchangeRate?: number }} config
 */
export function formatMoney(n, { currency = "PKR", country = "PK", exchangeRate = 1 } = {}) {
  const localeTag = COUNTRY_LOCALE_TAG[country] ?? "en";
  const fractionDigits = currency === "PKR" ? 0 : 2;
  const rate = currency !== "PKR" && exchangeRate > 0 ? exchangeRate : 1;
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(n || 0) * rate);
}
