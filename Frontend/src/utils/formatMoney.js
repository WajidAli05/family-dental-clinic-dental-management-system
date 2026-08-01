// Maps config country code to the Intl locale tag used for number formatting.
// en-PK gives "Rs 1,000" (no decimals); "en" with SAR gives "SAR 1,000.00".
const COUNTRY_LOCALE_TAG = { PK: "en-PK", SA: "en" };

/**
 * Format a monetary value using the given currency/country config.
 * Pure function — safe to call in any context (React, PDF utils, stores).
 *
 * @param {number} n
 * @param {{ currency?: string, country?: string }} config
 */
export function formatMoney(n, { currency = "PKR", country = "PK" } = {}) {
  const localeTag = COUNTRY_LOCALE_TAG[country] ?? "en";
  const fractionDigits = currency === "PKR" ? 0 : 2;
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(n || 0));
}
