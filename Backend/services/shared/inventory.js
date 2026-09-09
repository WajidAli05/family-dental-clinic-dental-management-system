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
import InventoryItem from "../../models/InventoryItem.model.js";
import { parsePagination, buildSort } from "./paginate.js";
import { getNextSequence } from "./counters.js";

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
 * SKU generation — shared by both create paths.
 *
 * Owner's create already used the atomic counter (migrated in the prior
 * session). Receptionist's create never called it at all — it accepted a
 * free-text `sku` straight from the form and defaulted to "" when absent,
 * which is why new receptionist-created items showed a blank SKU. Both
 * creates now call this one function; the client can no longer set `sku`.
 */
async function computeInventorySkuSeed() {
  const rows = await InventoryItem.find({ sku: { $regex: /^SKU-\d+$/ } })
    .select("sku")
    .lean();
  let max = 0;
  for (const r of rows) {
    const m = /^SKU-(\d+)$/.exec(String(r.sku || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export async function nextInventorySku() {
  const n = await getNextSequence("inventoryitem_sku", computeInventorySkuSeed);
  return `SKU-${String(n).padStart(6, "0")}`;
}

/**
 * Stock adjustment math — the ONE place quantity changes for either role, so
 * "add"/"subtract"/"set" cannot compute differently per role.
 *
 * VALIDATION GAP THIS CLOSES: `Number("")` evaluates to `0` in JS, so an
 * empty quantity field previously passed `Number.isFinite` and silently
 * "succeeded" — in "set" mode (the modal's previous default) that meant an
 * owner opening the dialog and clicking Save without typing anything would
 * silently ZERO OUT the item, with no error and (before this session's other
 * fixes) no feedback that anything had happened at all. `add`/`subtract` of
 * an unspecified/zero quantity is never meaningful, so those two modes now
 * require qty > 0; `set` still permits an EXPLICIT 0 (deliberately marking an
 * item fully depleted is legitimate) but the frontend must send a real
 * number, not the coerced result of a blank input — enforced in the modal.
 */
export function computeStockAdjustment(currentQty, mode, qty) {
  const n = Number(qty);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Quantity must be a valid number, 0 or greater");
  }
  const m = String(mode || "set").toLowerCase();
  if ((m === "add" || m === "subtract") && n <= 0) {
    throw new Error(`Quantity must be greater than 0 to ${m === "add" ? "add" : "subtract"} stock`);
  }
  const current = Number(currentQty || 0);
  let next = current;
  if (m === "add") next = current + n;
  else if (m === "subtract") next = current - n;
  else next = n; // set
  return Math.max(0, next);
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
