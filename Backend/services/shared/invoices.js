import mongoose from "mongoose";
import Invoice from "../../models/Invoice.model.js";
import Patient from "../../models/Patient.model.js";
import User from "../../models/User.model.js";
import { invoiceStatus } from "./billing.js";
import {
  ensureFeeSchedules,
  defaultScheduleIdFrom,
  getTreatmentFee,
} from "./feeSchedules.js";

/**
 * Shared invoice core — ONE implementation of item validation, price
 * resolution and totalling, used by both the receptionist and owner paths.
 *
 * This exists because the repo has repeatedly grown divergent copies of the
 * same logic in owner/receptionist/dentist services. Invoices are money, so a
 * second copy that drifts is the worst possible place for that to happen.
 *
 * MATH: totals are always the sum of server-computed line totals. billing.js
 * remains the authority for revenue/outstanding/status aggregates and is not
 * touched here.
 */

const VALID_KINDS = ["consultation", "treatment", "lab_sample"];
const isObjectId = (v) => mongoose.isValidObjectId(v);
const money = (v) => Math.max(0, Number(v) || 0);

/**
 * Validates line items and RESOLVES treatment prices server-side.
 *
 * Pricing by kind:
 *   treatment    → getTreatmentFee(treatment, feeScheduleId) — the fee
 *                  schedule decides, NOT the client. A client price is only
 *                  honoured when the line is explicitly flagged as a manual
 *                  override (priceOverridden), which is what lets a user
 *                  discount one line without disabling schedule pricing.
 *   consultation → clinic-configured consultation fee, sent by the client;
 *                  fee schedules do not price consultations (they price the
 *                  ClinicalMaster treatment catalogue only).
 *   lab_sample   → SampleType.price, likewise outside fee schedules.
 *
 * Either way the LINE TOTAL is computed here, never trusted from the client.
 */
export async function validateAndPriceItems(rawItems, feeScheduleId) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (items.length === 0) return { items: [], totalAmount: 0 };

  const doc = await ensureFeeSchedules();
  const defaultScheduleId = defaultScheduleIdFrom(doc);
  const scheduleId = String(feeScheduleId || "").trim() || defaultScheduleId;

  const catalogue = new Map(
    (doc.treatments || []).map((t) => [String(t.id), t.toObject ? t.toObject() : t])
  );

  const priced = [];
  for (const it of items) {
    if (!VALID_KINDS.includes(it?.kind)) throw new Error(`Invalid item kind: ${it?.kind}`);

    const name = String(it.name || "").trim();
    if (!name) throw new Error("Item name is required");

    const qty = Math.max(1, Number(it.qty) || 1);
    if (Number(it.unitPrice) < 0) throw new Error("Item unitPrice cannot be negative");

    let unitPrice = money(it.unitPrice);
    let priceOverridden = !!it.priceOverridden;

    if (it.kind === "treatment" && it.refId) {
      const treatment = catalogue.get(String(it.refId));
      if (treatment) {
        const resolved = getTreatmentFee(treatment, scheduleId, defaultScheduleId);
        if (priceOverridden) {
          // Manual override wins for THIS line, but it is recorded as such so
          // the price is never mistaken for the schedule's own.
          unitPrice = money(it.unitPrice);
        } else {
          // Client price is ignored — the schedule is authoritative.
          unitPrice = resolved;
        }
      }
    }

    priced.push({
      kind: it.kind,
      refId: String(it.refId || ""),
      name,
      unitPrice,
      qty,
      lineTotal: unitPrice * qty,
      priceOverridden,
    });
  }

  const totalAmount = priced.reduce((sum, it) => sum + it.lineTotal, 0);
  return { items: priced, totalAmount };
}

/** Resolves a patient by publicId / mr / phone / ObjectId. */
async function findPatient(patientKey) {
  const or = [];
  if (isObjectId(patientKey)) or.push({ _id: patientKey });
  or.push({ publicId: String(patientKey).toUpperCase() });
  if (/^\d+$/.test(String(patientKey))) {
    or.push({ mr: Number(patientKey) });
    or.push({ publicId: `PT-${String(patientKey).padStart(4, "0")}` });
  }
  or.push({ phone: String(patientKey) });

  const patient = await Patient.findOne({ $or: or });
  if (!patient) throw new Error("Patient not found");
  return patient;
}

async function findDentist(dentistKey) {
  if (!dentistKey) return null;
  const or = [];
  if (isObjectId(dentistKey)) or.push({ _id: dentistKey });
  or.push({ publicId: String(dentistKey) });
  or.push({ name: String(dentistKey) });

  const dentist = await User.findOne({ role: "dentist", $or: or }).select("_id");
  if (!dentist) throw new Error("Dentist not found");
  return dentist;
}

/** Loads an invoice by publicId, or throws a 404-shaped error. */
export async function loadInvoice(invoicePublicId) {
  const inv = await Invoice.findOne({ publicId: String(invoicePublicId || "").trim() });
  if (!inv) throw Object.assign(new Error("Invoice not found"), { status: 404 });
  return inv;
}

export const paidTotal = (inv) =>
  (inv?.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

/**
 * Edits an existing invoice: items, qty, unit prices, fee schedule, date,
 * dentist. Totals are ALWAYS recomputed server-side from the items.
 *
 * FINANCIAL INTEGRITY: the new total may never drop below what has already
 * been paid — that would manufacture a negative balance and silently turn a
 * settled invoice into an over-payment. Blocked with 409.
 */
export async function updateInvoiceCore(invoicePublicId, body = {}) {
  const inv = await loadInvoice(invoicePublicId);
  const alreadyPaid = paidTotal(inv);

  if (body.date !== undefined) {
    const date = String(body.date || "").trim();
    if (!date) throw new Error("date is required");
    inv.date = date;
  }

  if (body.dentistId !== undefined) {
    const dentist = await findDentist(body.dentistId);
    inv.dentist = dentist?._id;
  }

  const scheduleChanged = body.feeScheduleId !== undefined;
  if (scheduleChanged) inv.feeScheduleId = String(body.feeScheduleId || "").trim();

  // Re-price when items are supplied, or when only the schedule changed (the
  // existing lines must follow the new schedule).
  if (Array.isArray(body.items)) {
    const { items, totalAmount } = await validateAndPriceItems(body.items, inv.feeScheduleId);
    if (items.length === 0) throw new Error("Add at least one line item");
    if (totalAmount <= 0) throw new Error("Invoice total must be greater than 0");
    if (totalAmount < alreadyPaid) {
      throw Object.assign(
        new Error(
          `Cannot reduce the invoice total to ${totalAmount} — ${alreadyPaid} has already been paid. Refund or remove the payment first.`
        ),
        { status: 409 }
      );
    }
    inv.items = items;
    inv.totalAmount = totalAmount;
  } else if (scheduleChanged && (inv.items || []).length > 0) {
    const { items, totalAmount } = await validateAndPriceItems(inv.items, inv.feeScheduleId);
    if (totalAmount < alreadyPaid) {
      throw Object.assign(
        new Error(
          `That fee schedule would drop the total to ${totalAmount}, below the ${alreadyPaid} already paid.`
        ),
        { status: 409 }
      );
    }
    inv.items = items;
    inv.totalAmount = totalAmount;
  }

  await inv.save();
  return inv;
}

/**
 * SOFT-deletes an invoice. Financial records are never hard-deleted.
 *
 * Blocked when payments exist: the softDelete plugin filters `aggregate` too,
 * so hiding an invoice that carries payments would silently remove that money
 * from billing.js revenueCollected/outstanding — the cashbook would change
 * retroactively. Delete the payments first if the invoice really is void.
 */
export async function softDeleteInvoiceCore(invoicePublicId) {
  const inv = await loadInvoice(invoicePublicId);
  const paid = paidTotal(inv);

  if (paid > 0) {
    throw Object.assign(
      new Error(
        `Cannot delete invoice ${inv.publicId}: ${paid} has been paid against it. Remove the payments first if this invoice is void.`
      ),
      { status: 409 }
    );
  }

  await inv.softDelete();
  return { message: "Deleted", id: inv.publicId };
}

export { findPatient, findDentist };
