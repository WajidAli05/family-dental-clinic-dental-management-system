/**
 * Suppliers — the ONE service path for owner + receptionist, exactly as
 * shared/inventory.js is for inventory items. Suppliers previously had NO
 * create path anywhere in the codebase (the model existed with a `required`
 * publicId that nothing ever populated) — everything here is new.
 *
 * LEDGER: mirrors services/shared/finance.js's lab-dues pattern exactly
 * (labDuesSummary / labBillsForLab) rather than inventing new financial
 * logic. "Billed" accrues from RECEIVED purchase orders (a PO only becomes a
 * debt once goods actually arrive — matching normal AP accounting and the
 * brief's "a received PO creates/updates the supplier's billed amount").
 * "Paid" is the sum of the append-only SupplierPayment ledger — never a
 * running total that could drift. FIFO allocation walks the supplier's
 * billed POs oldest-first, exactly like labBillsForLab walks LabBills.
 */

import mongoose from "mongoose";
import Supplier from "../../models/Supplier.model.js";
import PurchaseOrder from "../../models/PurchaseOrder.model.js";
import SupplierPayment from "../../models/SupplierPayment.model.js";
import { parsePagination, buildSort } from "./paginate.js";

/** POs in these statuses count as billed debt against the supplier. */
export const BILLED_PO_STATUSES = Object.freeze(["partially_received", "received", "closed"]);

function normalize(v) {
  return String(v ?? "").trim();
}

/** ONE canonical extraction of a Supplier document. */
export function mapSupplierCore(doc) {
  return {
    id: doc.publicId,
    name: doc.name || "",
    contactPerson: doc.contactPerson || "",
    phone: doc.phone || "",
    email: doc.email || "",
    address: doc.address || "",
    paymentTerms: doc.paymentTerms || "",
    notes: doc.notes || "",
    active: doc.active !== false,
    createdAt: doc.createdAt,
  };
}

/**
 * Supplier listing — used by the inventory item's supplier PICKER (needs
 * every active supplier, unpaginated-ish) AND the Suppliers management tab
 * (paginated + searchable). One function, `full: true` for the former.
 */
export async function listSuppliersShared({ page, limit, sortBy, sortDir, q, full = false } = {}) {
  const filter = {};
  const needle = normalize(q);
  if (needle) {
    filter.$or = [
      { name: { $regex: needle, $options: "i" } },
      { contactPerson: { $regex: needle, $options: "i" } },
      { phone: { $regex: needle, $options: "i" } },
      { email: { $regex: needle, $options: "i" } },
      { publicId: { $regex: needle, $options: "i" } },
    ];
  }

  const sort = buildSort(sortBy, sortDir, { name: 1 });

  if (full) {
    const rows = await Supplier.find(filter).sort(sort).lean();
    const mapped = rows.map(mapSupplierCore);
    return { rows: mapped, total: mapped.length, page: 1, pages: 1 };
  }

  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const finalSort = buildSort(sb, sd, { name: 1 });
  const [total, rows] = await Promise.all([
    Supplier.countDocuments(filter),
    Supplier.find(filter).sort(finalSort).skip(skip).limit(L).lean(),
  ]);
  return { rows: rows.map(mapSupplierCore), total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}

export async function getSupplierByPublicId(supplierPublicId) {
  const id = normalize(supplierPublicId);
  if (!id) throw new Error("Supplier id is required");
  const doc = await Supplier.findOne({ publicId: id });
  if (!doc) throw new Error("Supplier not found");
  return doc;
}

export async function createSupplierShared(body = {}) {
  const name = normalize(body.name);
  if (!name) throw new Error("name is required");

  const doc = await Supplier.create({
    name,
    contactPerson: normalize(body.contactPerson),
    phone: normalize(body.phone),
    email: normalize(body.email).toLowerCase(),
    address: normalize(body.address),
    paymentTerms: normalize(body.paymentTerms),
    notes: normalize(body.notes),
    active: body.active !== undefined ? !!body.active : true,
  });
  return mapSupplierCore(doc.toObject());
}

export async function updateSupplierShared(supplierPublicId, body = {}) {
  const doc = await getSupplierByPublicId(supplierPublicId);

  if (body.name !== undefined) {
    const name = normalize(body.name);
    if (!name) throw new Error("name is required");
    doc.name = name;
  }
  if (body.contactPerson !== undefined) doc.contactPerson = normalize(body.contactPerson);
  if (body.phone !== undefined) doc.phone = normalize(body.phone);
  if (body.email !== undefined) doc.email = normalize(body.email).toLowerCase();
  if (body.address !== undefined) doc.address = normalize(body.address);
  if (body.paymentTerms !== undefined) doc.paymentTerms = normalize(body.paymentTerms);
  if (body.notes !== undefined) doc.notes = normalize(body.notes);
  if (body.active !== undefined) doc.active = !!body.active;

  await doc.save();
  return mapSupplierCore(doc.toObject());
}

/** Never a hard delete — suppliers carry financial history (POs, payments). */
export async function softDeleteSupplierShared(supplierPublicId) {
  const doc = await getSupplierByPublicId(supplierPublicId);
  await doc.softDelete();
  return { id: doc.publicId, deleted: true };
}

// ── Ledger ───────────────────────────────────────────────────────────────────

/**
 * Billed/paid/outstanding for every supplier, oldest-billed-first like
 * labDuesSummary. `paid` sums SupplierPayment (authoritative); `remaining`
 * is derived, floored at 0.
 */
export async function supplierDuesSummary() {
  const [billed, payments] = await Promise.all([
    PurchaseOrder.aggregate([
      { $match: { status: { $in: BILLED_PO_STATUSES } } },
      { $group: { _id: "$supplier", totalBilled: { $sum: "$total" } } },
    ]),
    SupplierPayment.aggregate([
      { $group: { _id: "$supplierId", paid: { $sum: "$amount" } } },
    ]),
  ]);

  const supplierIds = billed.map((b) => b._id).filter(Boolean);
  const supplierDocs = await Supplier.find({ _id: { $in: supplierIds } })
    .setOptions({ includeDeleted: true })
    .select("publicId name")
    .lean();
  const bySupplierObjId = new Map(supplierDocs.map((s) => [String(s._id), s]));
  const paidMap = new Map(payments.map((p) => [String(p._id), Number(p.paid || 0)]));

  return billed.map((b) => {
    const sup = bySupplierObjId.get(String(b._id));
    const totalBilled = Number(b.totalBilled || 0);
    const paid = paidMap.get(sup?.publicId || "") || 0;
    return {
      supplierId: sup?.publicId || "",
      name: sup?.name || "",
      totalBilled,
      paid,
      remaining: Math.max(0, totalBilled - paid),
    };
  }).filter((r) => r.supplierId).sort((a, b) => b.remaining - a.remaining);
}

/**
 * ONE supplier's ledger: billed/paid/outstanding + FIFO-allocated payment
 * history across its billed purchase orders — mirrors labBillsForLab.
 */
export async function supplierLedger(supplierPublicId, { page = 1, limit = 50 } = {}) {
  const supplier = await getSupplierByPublicId(supplierPublicId);
  const pg = Math.max(1, Number(page) || 1);
  const lm = Math.min(200, Number(limit) || 50);
  const skip = (pg - 1) * lm;

  const [allPOs, totalPaidAgg, paymentHistory] = await Promise.all([
    PurchaseOrder.find({ supplier: supplier._id, status: { $in: BILLED_PO_STATUSES } })
      .sort({ date: 1 })
      .lean(),
    SupplierPayment.aggregate([
      { $match: { supplierId: supplier.publicId } },
      { $group: { _id: null, paid: { $sum: "$amount" } } },
    ]),
    SupplierPayment.find({ supplierId: supplier.publicId }).sort({ date: -1, createdAt: -1 }).lean(),
  ]);

  // FIFO: walk oldest -> newest, fill each PO's bill from the payment pool.
  let pool = Number(totalPaidAgg[0]?.paid || 0);
  const allocationMap = new Map();
  for (const po of allPOs) {
    const amount = Number(po.total || 0);
    const allocated = Math.min(pool, amount);
    allocationMap.set(String(po._id), allocated);
    pool = Math.max(0, pool - allocated);
  }

  const totalBilled = allPOs.reduce((s, po) => s + Number(po.total || 0), 0);
  const totalPaid = Number(totalPaidAgg[0]?.paid || 0);

  const pagedPOs = allPOs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(skip, skip + lm);

  const poRows = pagedPOs.map((po) => {
    const amount = Number(po.total || 0);
    const paid = allocationMap.get(String(po._id)) || 0;
    return {
      id: po.publicId,
      date: po.date,
      status: po.status || "received",
      amount,
      paid,
      remaining: Math.max(0, amount - paid),
      fullyPaid: paid >= amount,
    };
  });

  return {
    supplier: mapSupplierCore(supplier.toObject ? supplier.toObject() : supplier),
    totalBilled,
    totalPaid,
    outstanding: Math.max(0, totalBilled - totalPaid),
    purchaseOrders: { rows: poRows, total: allPOs.length, page: pg, pages: Math.max(1, Math.ceil(allPOs.length / lm)) },
    payments: paymentHistory.map((p) => ({
      id: p.publicId,
      amount: Number(p.amount || 0),
      date: p.date,
      method: p.method || "cash",
      reference: p.reference || "",
      note: p.note || "",
    })),
  };
}

/**
 * Records a payment against a supplier. Mirrors ownerRecordLabPayment
 * exactly (same lack of an overpayment guard — a supplier ledger going
 * temporarily negative-outstanding is a bookkeeping correction the owner can
 * see and reconcile, not an error state to block).
 */
export async function recordSupplierPaymentShared({ supplierId, amount, date, method, reference, note } = {}) {
  const supplier = await getSupplierByPublicId(supplierId);
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error("amount must be positive");
  const d = normalize(date) || new Date().toISOString().slice(0, 10);
  const m = normalize(method) || "cash";

  // publicId is generated by the model's own pre("validate") hook — the same
  // atomic path used by every other new id in this codebase.
  const doc = await SupplierPayment.create({
    supplierId: supplier.publicId,
    supplierName: supplier.name,
    amount: amt,
    date: d,
    method: m,
    reference: normalize(reference),
    note: normalize(note),
  });

  return {
    id: doc.publicId,
    supplierId: supplier.publicId,
    amount: amt,
    date: d,
    method: m,
  };
}

export { mongoose };
