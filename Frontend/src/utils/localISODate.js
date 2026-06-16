/**
 * Returns the caller's LOCAL calendar date as "YYYY-MM-DD".
 * Use this everywhere "today" is needed for receptionist views so that
 * appointments stored with the local date are matched correctly.
 * Never use new Date().toISOString().slice(0,10) — that returns UTC.
 */
export const localISODate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
