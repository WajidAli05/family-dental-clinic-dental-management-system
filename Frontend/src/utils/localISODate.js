/**
 * Returns "YYYY-MM-DD" for the given date.
 *
 * When `timezone` is provided (e.g. "Asia/Karachi", "Asia/Riyadh"), the date
 * parts are resolved in that timezone via Intl — correct even when the caller's
 * local clock is in a different zone.
 *
 * Without timezone, falls back to the caller's local wall-clock time.
 * Never use new Date().toISOString().slice(0,10) — that returns UTC.
 *
 * @param {Date}   d
 * @param {string} [timezone]  IANA timezone string, e.g. "Asia/Karachi"
 */
export const localISODate = (d = new Date(), timezone) => {
  if (timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone:  timezone,
      year:      "numeric",
      month:     "2-digit",
      day:       "2-digit",
    }).formatToParts(d);
    const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
