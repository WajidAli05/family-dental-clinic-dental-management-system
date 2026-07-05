// Shared pagination + sort helpers used by all list service functions.

export function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "50", 10) || 50));
  const skip = (page - 1) * limit;
  const sortDir = String(query.sortDir || "").toLowerCase() === "asc" ? 1 : -1;
  const sortBy = String(query.sortBy || "").trim();
  return { page, limit, skip, sortDir, sortBy };
}

// Slice a pre-filtered array into one page and return the standard envelope.
export function paginateArray(arr, page, limit) {
  const total = arr.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(page, pages);
  const rows = arr.slice((p - 1) * limit, p * limit);
  return { rows, total, page: p, pages };
}

// Build a Mongoose sort object; falls back to defaultSort when sortBy is empty.
export function buildSort(sortBy, sortDir, defaultSort) {
  if (!sortBy) return defaultSort;
  return { [sortBy]: sortDir };
}
