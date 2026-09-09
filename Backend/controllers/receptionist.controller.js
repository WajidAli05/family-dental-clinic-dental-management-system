import {
  receptionistGetMe,
  receptionistUpdateMe,
  receptionistChangePassword,
  receptionistGetStats,
  receptionistGetAppointments,
  receptionistGetLabSamples,
  receptionistCreatePatient,
  receptionistUpdatePatient,
  receptionistCreateAppointment,
    receptionistGetPatients,
  receptionistGetPatientStats,
    receptionistGetDentists,
  receptionistLookupPatient,
    receptionistListAppointments,
  receptionistUpdateAppointmentStatus,
  receptionistUpdateAppointment,
  receptionistRescheduleAppointment,

    receptionistListLabSamples,
  receptionistCreateLabSample,
  receptionistUpdateLabSample,
  receptionistUpdateLabSampleStatus,
  receptionistDeliverLabSample,
  receptionistDeleteLabSample,

    receptionistGetLabs,
  receptionistGetSampleTypes,

    receptionistListInvoices,
  receptionistBillingStats,
  receptionistListLabBills,
  receptionistAddInvoicePayment,
  receptionistUpdateInvoicePayment,
  receptionistDeleteInvoicePayment,
  receptionistCreateInvoice,
  // âœ… Inventory service functions (IMPORTANT)
  receptionistListInventory,
  receptionistInventoryStats,
  receptionistCreateInventoryItem,
  receptionistUpdateInventoryItem,
  receptionistUpdateInventoryStock,
  receptionistDeleteInventoryItem,
  receptionistListSuppliers,
  receptionistCreateSupplier,
  receptionistUpdateSupplier,
  receptionistDeleteSupplier,
  receptionistGetSupplierLedger,
  receptionistRecordSupplierPayment,
  receptionistListPurchaseOrders,
  receptionistGetPurchaseOrder,
  receptionistCreatePurchaseOrder,
  receptionistUpdatePurchaseOrderStatus,
  receptionistReceivePurchaseOrder,
} from "../services/receptionist.service.js";

import { getActiveTreatments, getActiveSampleTypes } from "../services/shared/catalog.js";
import { updateInvoiceCore } from "../services/shared/invoices.js";
import { listFeeSchedules } from "../services/shared/feeSchedules.js";
import { findPatientsByPhone, medicalFieldsChanged } from "../services/shared/patients.js";
import { recordAudit } from "../services/shared/audit.js";

export const getReceptionistMe = async (req, res) => {
  try {
    const me = await receptionistGetMe(req.user._id);
    return res.json({ success: true, data: me });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateReceptionistMe = async (req, res) => {
  try {
    const updated = await receptionistUpdateMe(req.user._id, req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const changeReceptionistPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const updated = await receptionistChangePassword(req.user._id, {
      currentPassword,
      newPassword,
    });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// dashboard
export const getReceptionistStats = async (req, res) => {
  try {
    const { date } = req.query;
    const stats = await receptionistGetStats(req.user._id, { date });
    return res.json({ success: true, data: stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getReceptionistLabSamples = async (req, res) => {
  try {
    const { status, q, date, page, limit, sortBy, sortDir } = req.query;
    const result = await receptionistListLabSamples(req.user._id, { status, q, date, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// quick actions used by modals
export const createReceptionistPatient = async (req, res) => {
  try {
    const created = await receptionistCreatePatient(req.user, req.body);
    // Sensitive-field markers only (never the decrypted values) — insurance
    // and emergency-contact data are PHI-adjacent even though the audit
    // action itself ("patient.create") is the same one already in use.
    await recordAudit({ req, action: "patient.create", entityType: "Patient", entityId: created?.id, entityLabel: created?.name, after: { id: created?.id, name: created?.name, phone: created?.phone, status: created?.status, insuranceSet: Boolean(req.body?.insurance), emergencyContactSet: Boolean(req.body?.emergencyContact), medicalInfoSet: medicalFieldsChanged(req.body) } });
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateReceptionistPatient = async (req, res) => {
  try {
    const updated = await receptionistUpdatePatient(req.user, req.params.id, req.body);
    await recordAudit({ req, action: "patient.update", entityType: "Patient", entityId: req.params.id, entityLabel: updated?.name, after: { id: updated?.id, name: updated?.name, phone: updated?.phone, status: updated?.status, insuranceChanged: Boolean(req.body?.insurance), emergencyContactChanged: Boolean(req.body?.emergencyContact), medicalInfoChanged: medicalFieldsChanged(req.body) } });
    return res.json({ success: true, data: updated });
  } catch (e) {
    const status = e.message === "Patient not found" ? 404 : 400;
    return res.status(status).json({ success: false, message: e.message });
  }
};

export const getReceptionistDentists = async (req, res) => {
  try {
    const rows = await receptionistGetDentists(req.user._id);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const lookupReceptionistPatient = async (req, res) => {
  try {
    const { q } = req.query;
    const row = await receptionistLookupPatient(req.user._id, { q });
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const createReceptionistAppointment = async (req, res) => {
  try {
    const created = await receptionistCreateAppointment(req.user, req.body);
    await recordAudit({ req, action: "appointment.create", entityType: "Appointment", entityId: created?.id, entityLabel: created?.id, after: { status: created?.status, date: created?.date } });
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const rescheduleReceptionistAppointment = async (req, res) => {
  try {
    const data = await receptionistRescheduleAppointment(req.user._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "appointment.update", entityType: "Appointment", entityId: req.params.id, entityLabel: req.params.id, after: { rescheduled: true, from: { date: data?.previous?.date, time: data?.previous?.time }, to: { date: data?.date, time: data?.time }, dentistId: data?.dentistId, status: data?.statusCode } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const updateReceptionistAppointment = async (req, res) => {
  try {
    const updated = await receptionistUpdateAppointment(req.user._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "appointment.update", entityType: "Appointment", entityId: req.params.id, entityLabel: req.params.id, after: { date: updated?.date, time: updated?.time, dentistId: updated?.dentistId, patientId: updated?.patientId, appointmentType: updated?.appointmentType || "", status: updated?.statusCode } });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const getReceptionistPatients = async (req, res) => {
  try {
    const { q, limit, page, sortBy, sortDir } = req.query;
    const result = await receptionistGetPatients(req.user._id, { q, limit, page, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getReceptionistPatientStats = async (req, res) => {
  try {
    const stats = await receptionistGetPatientStats(req.user._id);
    return res.json({ success: true, data: stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const phoneCheckReceptionistPatients = async (req, res) => {
  try {
    const phone = String(req.query.phone || "").trim();
    if (!phone) return res.json({ success: true, data: [] });
    const matches = await findPatientsByPhone(phone);
    return res.json({ success: true, data: matches });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};


export const getReceptionistAppointments = async (req, res) => {
  try {
    const { date, dentist, status, q, page, limit, sortBy, sortDir } = req.query;
    const result = await receptionistListAppointments(req.user._id, { date, dentist, status, q, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateReceptionistAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params; // publicId e.g. APT-0001
    const { status } = req.body; // "Completed" | "Cancelled" | "Scheduled"
    const updated = await receptionistUpdateAppointmentStatus(req.user._id, id, { status });
    await recordAudit({ req, action: "appointment.status_change", entityType: "Appointment", entityId: id, entityLabel: id, after: { status: updated?.statusCode || updated?.status, requested: status } });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const createReceptionistLabSample = async (req, res) => {
  try {
    const created = await receptionistCreateLabSample(req.user, req.body);
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateReceptionistLabSample = async (req, res) => {
  try {
    const updated = await receptionistUpdateLabSample(req.user, req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateReceptionistLabSampleStatus = async (req, res) => {
  try {
    const updated = await receptionistUpdateLabSampleStatus(req.user, req.params.id, req.body);
    await recordAudit({ req, action: "labcase.status_change", entityType: "LabCase", entityId: req.params.id, entityLabel: req.params.id, after: { status: req.body?.status } });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const deliverReceptionistLabSample = async (req, res) => {
  try {
    const updated = await receptionistDeliverLabSample(req.user, req.params.id);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteReceptionistLabSample = async (req, res) => {
  try {
    const out = await receptionistDeleteLabSample(req.user, req.params.id);
    return res.json({ success: true, data: out });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getReceptionistLabs = async (req, res) => {
  try {
    const rows = await receptionistGetLabs(req.user._id);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getReceptionistSampleTypes = async (req, res) => {
  try {
    const rows = await receptionistGetSampleTypes(req.user._id);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const result = await receptionistListInvoices(req.user._id, req.query);
    res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const billingStats = async (req, res) => {
  try {
    const data = await receptionistBillingStats(req.user._id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listLabBills = async (req, res) => {
  try {
    const data = await receptionistListLabBills(req.user._id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/**
 * Receptionist invoice edit — same shared core the owner uses, so totals are
 * recomputed server-side and the below-paid rule applies identically.
 * Receptionists may create/edit/pay but never delete or void (owner-only).
 */
export const updateInvoiceCtrl = async (req, res) => {
  try {
    const invDoc = await updateInvoiceCore(req.params.id, req.body || {});
    await recordAudit({ req, action: "invoice.update", entityType: "Invoice", entityId: invDoc.publicId, entityLabel: invDoc.publicId, after: { totalAmount: invDoc.totalAmount, itemCount: (invDoc.items || []).length, feeScheduleId: invDoc.feeScheduleId || "" } });
    res.json({ success: true, data: { id: invDoc.publicId, totalAmount: invDoc.totalAmount } });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message, code: e.code });
  }
};

export const addInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistAddInvoicePayment(req.user._id, req.params.id, req.body);
    await recordAudit({ req, action: "invoice.payment", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { amount: req.body?.amount, mode: req.body?.mode, paidAmount: data?.paidAmount, status: data?.status } });
    res.json({ success: true, data });
  } catch (e) {
    // 409 from the overpayment guard must survive — the UI keys its toast off it.
    res.status(e.status || 400).json({ success: false, message: e.message, code: e.code });
  }
};

export const updateInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistUpdateInvoicePayment(
      req.user._id,
      req.params.id,
      req.params.paymentId,
      req.body
    );
    await recordAudit({ req, action: "invoice.payment", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { paymentId: req.params.paymentId, amount: req.body?.amount, paidAmount: data?.paidAmount, status: data?.status } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message, code: e.code });
  }
};

export const deleteInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistDeleteInvoicePayment(req.user._id, req.params.id, req.params.paymentId);
    // Removing a payment moves money — it was the one payment path not audited.
    await recordAudit({ req, action: "invoice.payment", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { removedPaymentId: req.params.paymentId, paidAmount: data?.paidAmount, status: data?.status } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message, code: e.code });
  }
};


// âœ… optional: create invoice endpoint (for "add via UI")
export const createInvoice = async (req, res) => {
  try {
    const data = await receptionistCreateInvoice(req.user._id, req.body);
    await recordAudit({ req, action: "invoice.create", entityType: "Invoice", entityId: data?.id, entityLabel: data?.id, after: { id: data?.id, totalAmount: data?.totalAmount, status: data?.status } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listInventory = async (req, res) => {
  try {
    const result = await receptionistListInventory(req.user?.id, req.query);
    res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const inventoryStats = async (req, res) => {
  try {
    const data = await receptionistInventoryStats(req.user?.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const createInventoryItem = async (req, res) => {
  try {
    const data = await receptionistCreateInventoryItem(req.user?.id, req.body);
    await recordAudit({ req, action: "inventory.create", entityType: "InventoryItem", entityId: data?.id, entityLabel: data?.name || data?.id, after: { sku: data?.sku, stock: data?.stock, minStock: data?.minStock } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const data = await receptionistUpdateInventoryItem(
      req.user?.id,
      req.params.id,
      req.body
    );
    await recordAudit({ req, action: "inventory.update", entityType: "InventoryItem", entityId: req.params.id, entityLabel: data?.name || req.params.id, after: { stock: data?.stock, minStock: data?.minStock, maximumStock: data?.maximumStock } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteInventoryItem = async (req, res) => {
  try {
    const data = await receptionistDeleteInventoryItem(req.user?.id, req.params.id);
    await recordAudit({ req, action: "inventory.delete", entityType: "InventoryItem", entityId: req.params.id, entityLabel: req.params.id });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Stock adjustment — parity with the owner's add/subtract/set flow, through
// the same shared computeStockAdjustment.
export const updateInventoryStock = async (req, res) => {
  try {
    const data = await receptionistUpdateInventoryStock(req.user?.id, req.params.id, req.body || {});
    await recordAudit({ req, action: "inventory.update", entityType: "InventoryItem", entityId: req.params.id, entityLabel: data?.name || req.params.id, after: { mode: req.body?.mode, stock: data?.stock } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Suppliers — the item picker's read (delegates to the same shared query as
// the owner side) PLUS full CRUD, matching the receptionist's existing full
// CRUD on inventory items. Recording a PAYMENT is owner-only (money out) —
// there is deliberately no receptionist route for it.
export const listInventorySuppliers = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir, q, full } = req.query;
    const result = await receptionistListSuppliers(req.user?.id, { page, limit, sortBy, sortDir, q, full: full === "true" });
    res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const data = await receptionistCreateSupplier(req.user?.id, req.body || {});
    await recordAudit({ req, action: "supplier.create", entityType: "Supplier", entityId: data.id, entityLabel: data.name, after: data });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const data = await receptionistUpdateSupplier(req.user?.id, req.params.id, req.body || {});
    await recordAudit({ req, action: "supplier.update", entityType: "Supplier", entityId: req.params.id, entityLabel: data.name, after: data });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const data = await receptionistDeleteSupplier(req.user?.id, req.params.id);
    await recordAudit({ req, action: "supplier.delete", entityType: "Supplier", entityId: req.params.id, entityLabel: req.params.id });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const getSupplierLedger = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const data = await receptionistGetSupplierLedger(req.user?.id, req.params.id, { page, limit });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/**
 * Receptionist may now record supplier payments (was owner-only). Reuses
 * the SAME shared FIFO service path as owner — recordAudit captures who
 * acted; recordedBy/recordedByName come only from req.user, never req.body.
 */
export const recordSupplierPayment = async (req, res) => {
  try {
    const actor = { recordedBy: req.user?.publicId || "", recordedByName: req.user?.name || "" };
    const data = await receptionistRecordSupplierPayment(req.user?.id, req.params.id, req.body || {}, actor);
    await recordAudit({
      req, action: "supplier.payment", entityType: "Supplier", entityId: req.params.id, entityLabel: req.params.id,
      after: { ...data, recordedBy: actor.recordedBy, recordedByName: actor.recordedByName },
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ── Purchase orders — both roles create/receive; delete stays owner-only ──

export const listPurchaseOrders = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir, supplierId, status } = req.query;
    const result = await receptionistListPurchaseOrders(req.user?.id, { page, limit, sortBy, sortDir, supplierId, status });
    res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const getPurchaseOrder = async (req, res) => {
  try {
    const data = await receptionistGetPurchaseOrder(req.user?.id, req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const data = await receptionistCreatePurchaseOrder(req.user?.id, req.body || {});
    await recordAudit({ req, action: "purchaseorder.create", entityType: "PurchaseOrder", entityId: data.id, entityLabel: data.id, after: data });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const data = await receptionistUpdatePurchaseOrderStatus(req.user?.id, req.params.id, req.body?.status);
    await recordAudit({ req, action: "purchaseorder.status_change", entityType: "PurchaseOrder", entityId: req.params.id, entityLabel: req.params.id, after: { status: data.status } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const receivePurchaseOrder = async (req, res) => {
  try {
    const data = await receptionistReceivePurchaseOrder(req.user?.id, req.params.id, req.body || {});
    await recordAudit({
      req, action: "purchaseorder.receive", entityType: "PurchaseOrder", entityId: req.params.id, entityLabel: req.params.id,
      after: { status: data.status, discrepancy: data.discrepancy },
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ── Catalog (read-only price catalog for receptionist) ──
export const getCatalogTreatments = async (req, res) => {
  try {
    // scheduleId lets the invoice modal price the catalogue from the chosen
    // fee schedule; omitted => default schedule (identical to before).
    const { page, limit, scheduleId } = req.query;
    const result = await getActiveTreatments({ page, limit, scheduleId });
    res.json({ success: true, rows: result.rows, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** Price lists the invoice modal can quote from (read-only). */
export const getInvoiceFeeSchedules = async (_req, res) => {
  try {
    res.json({ success: true, data: await listFeeSchedules() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getCatalogSampleTypes = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await getActiveSampleTypes({ page, limit });
    res.json({ success: true, rows: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
