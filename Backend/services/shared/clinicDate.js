import ClinicSettings from "../../models/ClinicSettings.model.js";

/**
 * Clinic-timezone "today", as "YYYY-MM-DD".
 *
 * The backend previously only had `todayISO()` (dentist.service.js), which is
 * `new Date().toISOString().slice(0,10)` — that is UTC, the exact thing the
 * frontend's localISODate util warns against. For Asia/Karachi (UTC+5) the UTC
 * date is still *yesterday* between local 00:00 and 05:00, so a UTC cutoff
 * would drop today's appointments from the picker for five hours every night.
 *
 * Mirrors Frontend/src/utils/localISODate.js so both sides agree on what "today"
 * means, and reads the clinic's configured timezone rather than the server's.
 */

const DEFAULT_TZ = "Asia/Karachi";

/** Format a Date as YYYY-MM-DD in the given IANA timezone. */
export function isoDateIn(d = new Date(), timezone = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** The clinic's configured IANA timezone (falls back to the model default). */
export async function getClinicTimezone() {
  try {
    const doc = await ClinicSettings.findOne({}).select("locale.timezone").lean();
    return doc?.locale?.timezone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

/** "YYYY-MM-DD" for today in the clinic's timezone. */
export async function clinicToday() {
  return isoDateIn(new Date(), await getClinicTimezone());
}

/**
 * True when `date` ("YYYY-MM-DD") is strictly before the clinic's today.
 * Dates are compared as strings — lexical order is chronological for this
 * format, the same convention billing.js and the invoice filters use.
 */
export async function isPastDate(date) {
  const d = String(date || "").trim();
  if (!d) return false;
  return d < (await clinicToday());
}
