/**
 * Inventory — shared read/compute path for owner + receptionist.
 *
 * WHY THIS FILE EXISTS: owner.service.js and receptionist.service.js each held
 * their own hand-rolled InventoryItem mapper (`mapItem` / `toUiItem`). The
 * receptionist's ALSO had a second, dead duplicate (`mapInventoryItem`) that
 * read `x.stock`/`x.minStock`/`x.packSize` — fields that do not exist on the
 * schema (the real fields are `qty`/`reorderLevel`; there is no `packSize`).
 * That duplicate is unreachable (nothing routes to it) so it was left as a
 * documented finding rather than rewired — see receptionist.service.js.
 *
 * Low-stock / near-expiry logic must not become a THIRD place this drifts.
 * Both services now build their per-role DTO on top of `mapInventoryItemCore`
 * below, which reads the real schema fields once and computes the passive
 * badges from real data — no notification/automation engine, that is a later
 * phase. Each role keeps its own key names (owner: qty/reorderLevel,
 * receptionist: stock/minStock) since rewriting either frontend's field
 * contract is out of scope for this gap-fill.
 */

import Supplier from "../../models/Supplier.model.js";
import { parsePagination, buildSort } from "./paginate.js";

/** A case is near-expiry when its expiryDate falls within this many days. */
export const NEAR_EXPIRY_DAYS = 30;

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Passive flags derived from data already on the document — no stored state,
 * nothing to keep in sync, nothing scheduled.
 */
export function computeInventoryFlags({ qty, reorderLevel, expiryDate }, today) {
  const q = Number(qty || 0);
  const r = Number(reorderLevel || 0);
  const lowStock = q > 0 && q <= r;
  const outOfStock = q === 0;

  let expiryState = ""; // "expired" | "near_expiry" | ""
  const exp = String(expiryDate || "").trim();
  if (exp && today) {
    if (exp < today) expiryState = "expired";
    else if (exp <= addDays(today, NEAR_EXPIRY_DAYS)) expiryState = "near_expiry";
  }

  return { lowStock, outOfStock, expiryState };
}

/**
 * ONE canonical extraction of an InventoryItem document — the real schema
 * fields, plus the two additive fields (batchNumber, maximumStock), plus the
 * derived flags. Both role mappers spread this and rename/add on top.
 */
export function mapInventoryItemCore(doc, today = "") {
  const qty = Number(doc.qty || 0);
  const reorderLevel = Number(doc.reorderLevel || 0);
  return {
    id: doc.publicId,
    sku: doc.sku || "",
    name: doc.name || "",
    category: doc.category || "",
    unit: doc.unit || "",
    qty,
    reorderLevel,
    maximumStock: Number(doc.maximumStock || 0),
    unitCost: Number(doc.unitCost || 0),
    supplier: doc.supplier || "",
    location: doc.location || "",
    expiryDate: doc.expiryDate || "",
    batchNumber: doc.batchNumber || "",
    usedIn: Array.isArray(doc.usedIn) ? doc.usedIn : [],
    ...computeInventoryFlags({ qty, reorderLevel, expiryDate: doc.expiryDate }, today),
  };
}

/** Fields either role's create/update may set for the two new columns. */
export function applyInventoryExtraFields(doc, body = {}) {
  if (body.batchNumber !== undefined) {
    doc.batchNumber = String(body.batchNumber || "").trim().slice(0, 120);
  }
  if (body.maximumStock !== undefined) {
    const n = Number(body.maximumStock);
    doc.maximumStock = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return doc;
}

/**
 * Supplier listing — was previously only on the owner side; the receptionist
 * add/edit modals had free-text supplier entry with no selector. One shared
 * query so both roles see the identical supplier list.
 */
export async function listSuppliersShared({ page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const sort = buildSort(sb, sd, { name: 1 });
  const [total, rows] = await Promise.all([
    Supplier.countDocuments({}),
    Supplier.find({}).sort(sort).skip(skip).limit(L).lean(),
  ]);
  const mapped = rows.map((s) => ({
    id: s.publicId,
    name: s.name || "",
    phone: s.phone || "",
    email: s.email || "",
    address: s.address || "",
  }));
  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}
