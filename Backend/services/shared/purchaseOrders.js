/**
 * Purchase orders — the ONE service path for owner + receptionist.
 *
 * LEGACY DATA: every pre-existing PurchaseOrder document predates `status`
 * and `qtyReceived` (both are additive). Those old documents were created by
 * the ad-hoc flow that incremented stock IMMEDIATELY at creation — there was
 * no receiving step. Reading a missing `status` as "received" (and a missing
 * per-line `qtyReceived` as fully received, for display) reflects what
 * actually happened to them and — critically — stops the new "receive"
 * action from being offered against a PO whose stock effect already landed,
 * which would otherwise double the stock. This is the exact "legacy alias
 * on read, nothing rewritten" pattern already used for lab-case and
 * appointment status.
 *
 * RECEIVING goes through computeStockAdjustment (services/shared/inventory.js)
 * — the SAME function the manual stock-adjust modal uses — so a receipt and a
 * manual "add" can never compute stock differently.
 */

import mongoose from "mongoose";
import PurchaseOrder, { PO_STATUSES } from "../../models/PurchaseOrder.model.js";
import InventoryItem from "../../models/InventoryItem.model.js";
import Supplier from "../../models/Supplier.model.js";
import { parsePagination, buildSort } from "./paginate.js";
import { computeStockAdjustment } from "./inventory.js";

function normalize(v) {
  return String(v ?? "").trim();
}

/**
 * Legal next statuses for the MANUAL status control, in canonical terms.
 * `partially_received` and `received` are deliberately absent as manual
 * destinations from anywhere — those two are set ONLY by
 * receivePurchaseOrderShared, as a consequence of actually receiving stock.
 * Allowing a manual jump to them would let someone claim receipt (and let
 * the ledger treat the PO as billed) without a single unit of stock moving.
 */
export const PO_TRANSITIONS = Object.freeze({
  draft: ["sent", "cancelled"],
  sent: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  partially_received: ["cancelled"],
  received: ["closed"],
  closed: [],
  cancelled: [],
});

/** Whether a receive action may currently be performed against this PO. */
export function canReceivePo(doc) {
  return ["sent", "confirmed", "partially_received"].includes(canonicalPoStatus(doc));
}

/** Statuses that count as this supplier owing money (goods have arrived). */
export const BILLED_STATUSES = Object.freeze(["partially_received", "received", "closed"]);

export function canonicalPoStatus(doc) {
  return doc?.status || "received"; // legacy alias — see file header
}

/**
 * `role` filters "cancelled" out for anyone but the owner, so the dropdown
 * this powers can never offer a transition the backend would 403 — the same
 * role-aware allowedNext pattern used for lab-case status.
 */
export function allowedNextPoStatuses(doc, role) {
  const legal = PO_TRANSITIONS[canonicalPoStatus(doc)] || [];
  if (role && role !== "owner") return legal.filter((s) => s !== "cancelled");
  return [...legal];
}

/** ONE canonical extraction of a PurchaseOrder document. */
export function mapPurchaseOrderCore(doc, role) {
  const status = canonicalPoStatus(doc);
  const isLegacy = !doc.status;

  const items = (Array.isArray(doc.items) ? doc.items : []).map((it) => {
    // Legacy lines never recorded a receipt — but their stock WAS already
    // applied at creation, so they display as fully received rather than a
    // false 100% shortfall.
    const qtyOrdered = Number(it.qty || 0);
    const qtyReceived = isLegacy ? qtyOrdered : Number(it.qtyReceived || 0);
    return {
      itemId: it.item?.publicId || it.itemPublicId || "",
      sku: it.item?.sku || it.sku || "",
      name: it.item?.name || it.name || "",
      unit: it.item?.unit || it.unit || "",
      qtyOrdered,
      qtyReceived,
      remaining: Math.max(0, qtyOrdered - qtyReceived),
      unitCost: Number(it.unitCost || 0),
      lineTotal: Number(it.lineTotal || 0),
      batchNumber: it.batchNumber || "",
      expiryDate: it.expiryDate || "",
    };
  });

  const totalOrdered = items.reduce((s, i) => s + i.qtyOrdered, 0);
  const totalReceived = items.reduce((s, i) => s + i.qtyReceived, 0);

  return {
    id: doc.publicId,
    date: doc.date,
    expectedDeliveryDate: doc.expectedDeliveryDate || "",
    status,
    allowedNext: allowedNextPoStatuses(doc, role),
    canReceive: canReceivePo(doc),
    supplierId: doc.supplier?.publicId || "",
    supplierName: doc.supplier?.name || "",
    invoiceNo: doc.invoiceNo || "",
    notes: doc.notes || "",
    total: Number(doc.total || 0),
    items,
    // A discrepancy is only meaningful once something has been received —
    // for a fresh draft/sent PO every line is legitimately 0-received.
    discrepancy: ["partially_received", "received", "closed"].includes(status)
      ? Math.max(0, totalOrdered - totalReceived)
      : 0,
    fullyReceived: totalOrdered > 0 && totalReceived >= totalOrdered,
    createdAt: doc.createdAt,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listPurchaseOrdersShared({ page, limit, sortBy, sortDir, supplierId, status, role } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const sort = buildSort(sb, sd, { date: -1, createdAt: -1 });

  const filter = {};
  if (supplierId && supplierId !== "all") {
    const sup = await Supplier.findOne({ publicId: normalize(supplierId) }).select("_id").lean();
    filter.supplier = sup?._id || null;
  }
  if (status && status !== "all") {
    // "received" as a filter must also surface legacy rows (no status field).
    filter.$or = status === "received"
      ? [{ status: "received" }, { status: { $exists: false } }]
      : [{ status }];
  }

  const [total, rows] = await Promise.all([
    PurchaseOrder.countDocuments(filter),
    PurchaseOrder.find(filter).populate("supplier", "publicId name").sort(sort).skip(skip).limit(L).lean(),
  ]);
  return { rows: rows.map((r) => mapPurchaseOrderCore(r, role)), total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}

export async function getPurchaseOrderShared(poPublicId, role) {
  const id = normalize(poPublicId);
  if (!id) throw new Error("Purchase order id is required");
  const doc = await PurchaseOrder.findOne({ publicId: id })
    .populate("supplier", "publicId name phone email address")
    .populate("items.item", "publicId sku name unit qty")
    .lean();
  if (!doc) throw new Error("Purchase order not found");
  return mapPurchaseOrderCore(doc, role);
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createPurchaseOrderShared(body = {}, role) {
  const date = normalize(body.date) || new Date().toISOString().slice(0, 10);
  const supplierId = normalize(body.supplierId);
  const expectedDeliveryDate = normalize(body.expectedDeliveryDate);
  const invoiceNo = normalize(body.invoiceNo);
  const notes = normalize(body.notes);
  const itemsIn = Array.isArray(body.items) ? body.items : [];

  if (!supplierId) throw new Error("supplierId is required");
  if (!itemsIn.length) throw new Error("At least one line item is required");

  const supplier = await Supplier.findOne({ publicId: supplierId }).select("_id publicId name").lean();
  if (!supplier) throw new Error("Supplier not found");

  const items = [];
  for (const row of itemsIn) {
    const itemId = normalize(row.itemId);
    const qty = Number(row.qty);
    const unitCost = Number(row.unitCost);
    if (!itemId) throw new Error("Each line requires itemId");
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("Each line requires qty > 0");

    const itemDoc = await InventoryItem.findOne({ publicId: itemId }).select("_id publicId sku name unit unitCost").lean();
    if (!itemDoc) throw new Error(`Inventory item not found: ${itemId}`);

    items.push({
      item: itemDoc._id,
      itemPublicId: itemDoc.publicId,
      sku: itemDoc.sku || "",
      name: itemDoc.name || "",
      unit: itemDoc.unit || "",
      qty,
      unitCost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : Number(itemDoc.unitCost || 0),
      qtyReceived: 0,
    });
  }

  // No stock effect at creation — that is now exclusively the RECEIVE action's
  // job (the point of the module, per the brief).
  const doc = await PurchaseOrder.create({
    date, expectedDeliveryDate, supplier: supplier._id, invoiceNo, notes, items, status: "draft",
  });

  const saved = await PurchaseOrder.findById(doc._id)
    .populate("supplier", "publicId name")
    .populate("items.item", "publicId sku name unit")
    .lean();
  return mapPurchaseOrderCore(saved, role);
}

// ── Status transitions (non-receiving) ──────────────────────────────────────

export async function updatePurchaseOrderStatusShared(poPublicId, nextStatus, { role } = {}) {
  const id = normalize(poPublicId);
  const next = normalize(nextStatus).toLowerCase();
  if (!PO_STATUSES.includes(next)) throw new Error(`Invalid status: ${next}`);

  const doc = await PurchaseOrder.findOne({ publicId: id });
  if (!doc) throw new Error("Purchase order not found");

  const current = canonicalPoStatus(doc);
  if (next === current) return mapPurchaseOrderCore(await hydrate(doc), role);

  if (next === "cancelled" && role !== "owner") {
    throw Object.assign(new Error("Only the owner can cancel a purchase order"), { status: 403 });
  }

  const legal = PO_TRANSITIONS[current] || [];
  if (!legal.includes(next)) {
    throw new Error(`Cannot move a purchase order from "${current}" to "${next}". Allowed: ${legal.join(", ") || "none"}.`);
  }

  doc.status = next;
  await doc.save();
  return mapPurchaseOrderCore(await hydrate(doc), role);
}

export async function deletePurchaseOrderShared(poPublicId, { role } = {}) {
  if (role !== "owner") {
    throw Object.assign(new Error("Only the owner can delete a purchase order"), { status: 403 });
  }
  const doc = await PurchaseOrder.findOne({ publicId: normalize(poPublicId) });
  if (!doc) throw new Error("Purchase order not found");
  await doc.softDelete();
  return { id: doc.publicId, deleted: true };
}

async function hydrate(doc) {
  return PurchaseOrder.findById(doc._id)
    .populate("supplier", "publicId name")
    .populate("items.item", "publicId sku name unit")
    .lean();
}

// ── Receiving — the critical path ───────────────────────────────────────────

/**
 * Receives a delivery against a PO. `lines` = [{ itemId, qtyReceived,
 * batchNumber, expiryDate }]. Only lines with qtyReceived > 0 do anything.
 *
 * Every stock increment goes through computeStockAdjustment in "add" mode —
 * the exact function the manual stock modal uses — inside a transaction that
 * also writes the PO's own qtyReceived/status, so a receipt and a manual
 * adjustment can never diverge and a partially-applied receipt can never
 * leave the PO and the stock disagreeing about what happened.
 */
export async function receivePurchaseOrderShared(poPublicId, { lines = [], actor, role } = {}) {
  const id = normalize(poPublicId);
  const doc = await PurchaseOrder.findOne({ publicId: id });
  if (!doc) throw new Error("Purchase order not found");

  const current = canonicalPoStatus(doc);
  if (!canReceivePo(doc)) {
    throw new Error(
      `Cannot receive against a purchase order with status "${current}". It must be sent, confirmed, or partially received first.`
    );
  }
  if (!doc.status) {
    // A legacy PO with no status has already had its stock effect applied —
    // receiving it again would double the stock. This should be unreachable
    // given the guard above (canonicalPoStatus maps it to "received"), kept
    // as an explicit safety net.
    throw new Error("This purchase order predates receiving and cannot be received again.");
  }

  const byItemId = new Map((Array.isArray(lines) ? lines : []).map((l) => [normalize(l.itemId), l]));
  if (!byItemId.size) throw new Error("At least one line with a received quantity is required");

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let anyReceived = false;
    let allComplete = true;

    for (const line of doc.items) {
      const input = byItemId.get(line.itemPublicId);
      const already = Number(line.qtyReceived || 0);
      const ordered = Number(line.qty || 0);

      if (input) {
        const delta = Number(input.qtyReceived);
        if (delta < 0 || !Number.isFinite(delta)) {
          throw new Error(`Received quantity for ${line.itemPublicId} must be 0 or greater`);
        }
        const remaining = Math.max(0, ordered - already);
        if (delta > remaining) {
          throw new Error(
            `Cannot receive ${delta} of ${line.itemPublicId} — only ${remaining} remain on this order`
          );
        }
        if (delta > 0) {
          anyReceived = true;
          const itemDoc = await InventoryItem.findById(line.item).session(session);
          if (!itemDoc) throw new Error(`Inventory item not found: ${line.itemPublicId}`);

          // THE shared stock path — identical math to the manual "Add" mode.
          itemDoc.qty = computeStockAdjustment(itemDoc.qty, "add", delta);
          if (normalize(input.batchNumber)) itemDoc.batchNumber = normalize(input.batchNumber).slice(0, 120);
          if (normalize(input.expiryDate)) itemDoc.expiryDate = normalize(input.expiryDate);
          await itemDoc.save({ session });

          line.qtyReceived = already + delta;
          if (normalize(input.batchNumber)) line.batchNumber = normalize(input.batchNumber);
          if (normalize(input.expiryDate)) line.expiryDate = normalize(input.expiryDate);
        }
      }

      if (Number(line.qtyReceived || 0) < ordered) allComplete = false;
    }

    if (!anyReceived) throw new Error("No received quantity was entered for any line");

    doc.status = allComplete ? "received" : "partially_received";
    await doc.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }

  return mapPurchaseOrderCore(await hydrate(doc), role);
}

export { PO_STATUSES };
