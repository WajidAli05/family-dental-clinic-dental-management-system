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
  receptionistDeleteInventoryItem,
} from "../services/receptionist.service.js";

import { getActiveTreatments, getActiveSampleTypes } from "../services/shared/catalog.js";
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
    return res.status(400).json({ success: false, message: e.message });
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
    await recordAudit({ req, action: "appointment.status_change", entityType: "Appointment", entityId: id, entityLabel: id, after: { status } });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
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
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
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

export const addInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistAddInvoicePayment(req.user._id, req.params.id, req.body);
    await recordAudit({ req, action: "invoice.payment", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { amount: req.body?.amount, method: req.body?.method } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
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
    await recordAudit({ req, action: "invoice.update", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { paymentId: req.params.paymentId, amount: req.body?.amount, method: req.body?.method } });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteInvoicePayment = async (req, res) => {
  try {
    const data = await receptionistDeleteInvoicePayment(req.user._id, req.params.id, req.params.paymentId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
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
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteInventoryItem = async (req, res) => {
  try {
    const data = await receptionistDeleteInventoryItem(req.user?.id, req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ── Catalog (read-only price catalog for receptionist) ──
export const getCatalogTreatments = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await getActiveTreatments({ page, limit });
    res.json({ success: true, rows: result.rows, total: result.total, page: result.page, pages: result.pages });
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
