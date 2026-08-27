// Backend/controllers/owner.controller.js
import {
  ownerDashboardOverview,
  ownerListAppointments,
  ownerCreateAppointment,
  ownerRescheduleAppointment,
  ownerUpdateAppointment,
  ownerUpdateAppointmentStatus,
  ownerDeleteAppointment,
  ownerPatientsList,
  ownerPatientProfile,
  ownerPatientDelete,
  ownerCreatePatient,
  ownerUpdatePatient,
  ownerUpdateOdontogram,
  ownerAppointmentClinical,

  ownerListLabAccounts,
  ownerCreateLabAccount,
  ownerUpdateLabAccount,
  ownerSetLabAccountEnabled,

  ownerListLabCases,
  ownerGetLabCase,
  ownerCreateLabCase,
  ownerUpdateLabCase,
  ownerDeleteLabCase,
  ownerUpdateLabCaseStatus,
  ownerListSampleTypes,
  ownerCreateSampleType,
  ownerUpdateSampleType,
  ownerDeleteSampleType,
  ownerListDentists,

  ownerBillingPayments,
  ownerBillingLabBills,
  ownerGetCommissionRules,
  ownerUpdateCommissionRules,
  ownerBillingARSummaryService,

  ownerCashbookData,
  ownerCommissionData,
  ownerRecordOwnerPayment,
  ownerListOwnerPayments,
  ownerLabDuesData,
  ownerRecordLabPayment,
  ownerLabBillsByLab,

  // âœ… STAFF + PERMISSIONS
  ownerStaffList,
  ownerStaffCreate,
  ownerStaffUpdate,
  ownerStaffDelete,
  ownerStaffSetEnabled,
  ownerPermissionsGet,
  ownerPermissionsUpdate,

    ownerInventoryListItems,
  ownerInventoryCreateItem,
  ownerInventoryUpdateItem,
  ownerInventoryUpdateStock,
  ownerInventoryDeleteItem,
  ownerInventoryListSuppliers,
  ownerInventoryListPurchases,
  ownerInventoryGetPurchase,
  ownerInventoryListConsumption,
  ownerInventoryCreatePurchase,

    ownerClinicalMasterGetAll,

  ownerClinicalCreateTreatment,
  ownerClinicalUpdateTreatment,
  ownerClinicalToggleTreatmentActive,
  ownerClinicalDeleteTreatment,

  ownerClinicalCreateDiagnosis,
  ownerClinicalUpdateDiagnosis,
  ownerClinicalDeleteDiagnosis,

  ownerClinicalCreateFinding,
  ownerClinicalUpdateFinding,
  ownerClinicalDeleteFinding,

    ownerSettingsGet,
  ownerSettingsUpdate,
  ownerSettingsChangePassword,

  ownerSearchMedications,
  ownerCreateOrGetMedication,
  ownerListMedications,
  ownerSwitchCountry,
} from "../services/owner.service.js";

import { findPatientsByPhone, medicalFieldsChanged } from "../services/shared/patients.js";
import { recordAudit } from "../services/shared/audit.js";
import {
  receptionistCreateInvoice,
  receptionistListInvoices,
  receptionistAddInvoicePayment,
  receptionistUpdateInvoicePayment,
  receptionistDeleteInvoicePayment,
} from "../services/receptionist.service.js";
import {
  updateInvoiceCore,
  softDeleteInvoiceCore,
  voidInvoiceCore,
  loadInvoice,
  paidTotal,
} from "../services/shared/invoices.js";
import { listFeeSchedules as listInvoiceFeeSchedules } from "../services/shared/feeSchedules.js";
import { getActiveTreatments } from "../services/shared/catalog.js";
import {
  listFeeSchedules,
  createFeeSchedule,
  renameFeeSchedule,
  setDefaultFeeSchedule,
  deleteFeeSchedule,
  setTreatmentPrice,
  clearTreatmentPrice,
} from "../services/shared/feeSchedules.js";

export const phoneCheckOwnerPatients = async (req, res) => {
  try {
    const phone = String(req.query.phone || "").trim();
    if (!phone) return res.json({ success: true, data: [] });
    const matches = await findPatientsByPhone(phone);
    return res.json({ success: true, data: matches });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// Dashboard overview
export const ownerGetDashboardOverview = async (req, res) => {
  try {
    const { date } = req.query;
    const data = await ownerDashboardOverview(req.user?._id, { date });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getOwnerAppointments = async (req, res) => {
  try {
    const { dateFrom, dateTo, dentistId, status, q, page, limit, sortBy, sortDir } = req.query;
    const result = await ownerListAppointments(req.user?._id, { dateFrom, dateTo, dentistId, status, q, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Patients
export const ownerListPatients = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir, q, status } = req.query;
    const result = await ownerPatientsList(req.user?._id, { page, limit, sortBy, sortDir, q, status });
    return res.json({
      success: true,
      data: result.rows,
      total: result.total,
      page: result.page,
      pages: result.pages,
      stats: result.dbStats,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerGetPatientProfile = async (req, res) => {
  try {
    const data = await ownerPatientProfile(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerDeletePatient = async (req, res) => {
  try {
    const data = await ownerPatientDelete(req.user?._id, req.params.id);
    await recordAudit({ req, action: "patient.delete", entityType: "Patient", entityId: req.params.id, entityLabel: data?.name || req.params.id, after: { status: data?.status, tags: data?.tags, cascaded: data?.cascaded } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// Labs
export const ownerListLabs = async (req, res) => {
  try {
    const data = await ownerListLabAccounts(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerCreateLab = async (req, res) => {
  try {
    const data = await ownerCreateLabAccount(req.user?._id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateLab = async (req, res) => {
  try {
    const data = await ownerUpdateLabAccount(req.user?._id, req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerToggleLabEnabled = async (req, res) => {
  try {
    const enabled = !!req.body?.enabled;
    const data = await ownerSetLabAccountEnabled(req.user?._id, req.params.id, enabled);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// Lab cases
export const ownerListLabCasesController = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir, q, status } = req.query;
    const result = await ownerListLabCases(req.user?._id, { page, limit, sortBy, sortDir, q, status });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerGetLabCaseController = async (req, res) => {
  try {
    const data = await ownerGetLabCase(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

export const ownerCreateLabCaseController = async (req, res) => {
  try {
    const data = await ownerCreateLabCase(req.user?._id, req.body);
    await recordAudit({ req, action: "labcase.create", entityType: "LabCase", entityId: data?.id, entityLabel: data?.id, after: { status: data?.status } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateLabCaseController = async (req, res) => {
  try {
    const data = await ownerUpdateLabCase(req.user?._id, req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerDeleteLabCaseController = async (req, res) => {
  try {
    const data = await ownerDeleteLabCase(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateLabCaseStatusController = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required" });
    const data = await ownerUpdateLabCaseStatus(req.user?._id, req.params.id, status);
    await recordAudit({ req, action: "labcase.status_change", entityType: "LabCase", entityId: req.params.id, entityLabel: req.params.id, after: { status } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

// Sample types
export const ownerListSampleTypesController = async (req, res) => {
  try {
    const data = await ownerListSampleTypes(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerCreateSampleTypeController = async (req, res) => {
  try {
    const data = await ownerCreateSampleType(req.user?._id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateSampleTypeController = async (req, res) => {
  try {
    const data = await ownerUpdateSampleType(req.user?._id, req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerDeleteSampleTypeController = async (req, res) => {
  try {
    const data = await ownerDeleteSampleType(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// Dentists for filters
export const ownerGetDentists = async (req, res) => {
  try {
    const data = await ownerListDentists(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Billing
export const ownerBillingListPayments = async (req, res) => {
  try {
    const { dateFrom, dateTo, dentistId, page, limit, sortBy, sortDir } = req.query;
    const result = await ownerBillingPayments(req.user?._id, { dateFrom, dateTo, dentistId, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerBillingListLabBills = async (req, res) => {
  try {
    const { month, labId, page, limit, sortBy, sortDir } = req.query;
    const result = await ownerBillingLabBills(req.user?._id, { month, labId, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerBillingGetCommissionRules = async (req, res) => {
  try {
    const data = await ownerGetCommissionRules(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerBillingUpdateCommissionRules = async (req, res) => {
  try {
    const data = await ownerUpdateCommissionRules(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerBillingARSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await ownerBillingARSummaryService(req.user?._id, { dateFrom, dateTo });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// =====================================================
// âœ… STAFF (NEW)
// =====================================================
export const ownerListStaff = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir } = req.query;
    const result = await ownerStaffList(req.user?._id, { page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerCreateStaff = async (req, res) => {
  try {
    const data = await ownerStaffCreate(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateStaff = async (req, res) => {
  try {
    const data = await ownerStaffUpdate(req.user?._id, req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerToggleStaffEnabled = async (req, res) => {
  try {
    const enabled = !!req.body?.enabled;
    const data = await ownerStaffSetEnabled(req.user?._id, req.params.id, enabled);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerDeleteStaff = async (req, res) => {
  try {
    const data = await ownerStaffDelete(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// =====================================================
// âœ… PERMISSIONS (NEW)
// =====================================================
export const ownerGetPermissions = async (req, res) => {
  try {
    const data = await ownerPermissionsGet(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerUpdatePermissions = async (req, res) => {
  try {
    const data = await ownerPermissionsUpdate(req.user?._id, req.body || {});
    await recordAudit({ req, action: "permission.change", entityType: "Permissions", entityLabel: "permissions", after: data });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// -----------------------------------------------------------------//
// =====================================================
// âœ… INVENTORY (OWNER) â€” Add-only
// =====================================================
export const ownerInventoryGetItems = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir, q } = req.query;
    const result = await ownerInventoryListItems(req.user?._id, { page, limit, sortBy, sortDir, q });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerInventoryCreateItemController = async (req, res) => {
  try {
    const data = await ownerInventoryCreateItem(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerInventoryUpdateItemController = async (req, res) => {
  try {
    const data = await ownerInventoryUpdateItem(req.user?._id, req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerInventoryUpdateStockController = async (req, res) => {
  try {
    const data = await ownerInventoryUpdateStock(req.user?._id, req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerInventoryDeleteItemController = async (req, res) => {
  try {
    const data = await ownerInventoryDeleteItem(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerInventoryGetSuppliers = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir } = req.query;
    const result = await ownerInventoryListSuppliers(req.user?._id, { page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerInventoryGetPurchases = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir } = req.query;
    const result = await ownerInventoryListPurchases(req.user?._id, { page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerInventoryGetPurchaseDetails = async (req, res) => {
  try {
    const data = await ownerInventoryGetPurchase(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerInventoryGetConsumption = async (req, res) => {
  try {
    const data = await ownerInventoryListConsumption(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerInventoryCreatePurchaseController = async (req, res) => {
  try {
    const data = await ownerInventoryCreatePurchase(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};


// ==============================
// âœ… CLINICAL MASTER (OWNER)
// ==============================
export const ownerClinicalMasterGetAllController = async (req, res) => {
  try {
    const data = await ownerClinicalMasterGetAll(req.user?._id, { scheduleId: req.query?.scheduleId });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


// ==============================
// INVOICES (OWNER) — create / edit / soft-delete
// Owner-only by mount: router.use("/owner", auth(["owner"]), ownerRoutes).
// Create + list reuse the receptionist service verbatim so the two roles can
// never drift; edit/delete live in shared/invoices.js for the same reason.
// ==============================
const invFail = (res, e) =>
  res.status(e.status || 400).json({ success: false, message: e.message });

export const ownerListInvoicesController = async (req, res) => {
  try {
    const result = await receptionistListInvoices(req.user?._id, req.query || {});
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) { return invFail(res, e); }
};


/**
 * VOID — owner-only. The alternative to deleting an invoice that has payments:
 * the record and its payments are preserved, but it leaves active revenue.
 */
export const ownerVoidInvoiceController = async (req, res) => {
  try {
    const data = await voidInvoiceCore(req.params.id, {
      reason: req.body?.reason,
      actor: req.user?.publicId || String(req.user?._id || ""),
    });
    await recordAudit({
      req, action: "invoice.void", entityType: "Invoice", entityId: data.id, entityLabel: data.id,
      after: { voidReason: data.voidReason, totalAmount: data.totalAmount, paidAmount: data.paidAmount },
    });
    return res.json({ success: true, data });
  } catch (e) { return invFail(res, e); }
};

// ── Payments (owner parity with receptionist; same service, same guards) ────
export const ownerAddInvoicePaymentController = async (req, res) => {
  try {
    const data = await receptionistAddInvoicePayment(req.user?._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "invoice.payment", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { amount: Number(req.body?.amount) || 0, mode: req.body?.mode, date: req.body?.date, paidAmount: data?.paidAmount, status: data?.status } });
    return res.json({ success: true, data });
  } catch (e) { return invFail(res, e); }
};

export const ownerUpdateInvoicePaymentController = async (req, res) => {
  try {
    const data = await receptionistUpdateInvoicePayment(req.user?._id, req.params.id, req.params.paymentId, req.body || {});
    await recordAudit({ req, action: "invoice.payment", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { paymentId: req.params.paymentId, amount: Number(req.body?.amount) || 0, paidAmount: data?.paidAmount, status: data?.status } });
    return res.json({ success: true, data });
  } catch (e) { return invFail(res, e); }
};

export const ownerDeleteInvoicePaymentController = async (req, res) => {
  try {
    const data = await receptionistDeleteInvoicePayment(req.user?._id, req.params.id, req.params.paymentId);
    await recordAudit({ req, action: "invoice.payment", entityType: "Invoice", entityId: req.params.id, entityLabel: req.params.id, after: { removedPaymentId: req.params.paymentId, paidAmount: data?.paidAmount, status: data?.status } });
    return res.json({ success: true, data });
  } catch (e) { return invFail(res, e); }
};

/** Priced treatment catalogue for the invoice modal (owner side). */
export const ownerGetCatalogTreatmentsController = async (req, res) => {
  try {
    const { page, limit, scheduleId } = req.query;
    const result = await getActiveTreatments({ page, limit, scheduleId });
    return res.json({ success: true, data: result.rows, rows: result.rows, total: result.total });
  } catch (e) { return invFail(res, e); }
};

export const ownerGetInvoiceFeeSchedulesController = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listInvoiceFeeSchedules() });
  } catch (e) { return invFail(res, e); }
};

export const ownerCreateInvoiceController = async (req, res) => {
  try {
    const data = await receptionistCreateInvoice(req.user, req.body || {});
    // Money figures are business data, not PHI. No patient names in the log.
    await recordAudit({ req, action: "invoice.create", entityType: "Invoice", entityId: data?.id, entityLabel: data?.id, after: { totalAmount: data?.totalAmount, itemCount: data?.items?.length ?? 0, feeScheduleId: data?.feeScheduleId || "" } });
    return res.json({ success: true, data });
  } catch (e) { return invFail(res, e); }
};

export const ownerUpdateInvoiceController = async (req, res) => {
  try {
    const before = await loadInvoice(req.params.id);
    const beforeTotal = Number(before.totalAmount) || 0;

    const inv = await updateInvoiceCore(req.params.id, req.body || {});
    await recordAudit({
      req, action: "invoice.update", entityType: "Invoice", entityId: inv.publicId, entityLabel: inv.publicId,
      before: { totalAmount: beforeTotal },
      after: { totalAmount: inv.totalAmount, itemCount: (inv.items || []).length, feeScheduleId: inv.feeScheduleId || "", paidAmount: paidTotal(inv) },
    });
    return res.json({ success: true, data: { id: inv.publicId, totalAmount: inv.totalAmount } });
  } catch (e) { return invFail(res, e); }
};

export const ownerDeleteInvoiceController = async (req, res) => {
  try {
    const data = await softDeleteInvoiceCore(req.params.id);
    await recordAudit({ req, action: "invoice.delete", entityType: "Invoice", entityId: data.id, entityLabel: data.id, after: { softDeleted: true } });
    return res.json({ success: true, data });
  } catch (e) { return invFail(res, e); }
};

// ---------- Fee schedules ----------
// Owner-only by mount: router.use("/owner", auth(["owner"]), ownerRoutes).
// Audited as config.update — ClinicalMaster IS clinic configuration, so no new
// audit enum action is needed. Prices are business config, never PHI.
const feeFail = (res, e) => res.status(e.status || 400).json({ success: false, message: e.message });

export const ownerListFeeSchedulesController = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listFeeSchedules() });
  } catch (e) { return feeFail(res, e); }
};

export const ownerCreateFeeScheduleController = async (req, res) => {
  try {
    const data = await createFeeSchedule(req.body?.name);
    await recordAudit({ req, action: "config.update", entityType: "FeeSchedule", entityId: data.id, entityLabel: data.name, after: { created: data.id, name: data.name } });
    return res.json({ success: true, data });
  } catch (e) { return feeFail(res, e); }
};

export const ownerRenameFeeScheduleController = async (req, res) => {
  try {
    const data = await renameFeeSchedule(req.params.id, req.body?.name);
    await recordAudit({ req, action: "config.update", entityType: "FeeSchedule", entityId: data.id, entityLabel: data.name, after: { renamed: data.id, name: data.name } });
    return res.json({ success: true, data });
  } catch (e) { return feeFail(res, e); }
};

export const ownerSetDefaultFeeScheduleController = async (req, res) => {
  try {
    const data = await setDefaultFeeSchedule(req.params.id);
    await recordAudit({ req, action: "config.update", entityType: "FeeSchedule", entityId: req.params.id, entityLabel: req.params.id, after: { defaultScheduleId: req.params.id } });
    return res.json({ success: true, data });
  } catch (e) { return feeFail(res, e); }
};

export const ownerDeleteFeeScheduleController = async (req, res) => {
  try {
    const data = await deleteFeeSchedule(req.params.id);
    await recordAudit({ req, action: "config.update", entityType: "FeeSchedule", entityId: req.params.id, entityLabel: req.params.id, after: { deleted: req.params.id } });
    return res.json({ success: true, data });
  } catch (e) { return feeFail(res, e); }
};

export const ownerSetTreatmentPriceController = async (req, res) => {
  try {
    const data = await setTreatmentPrice(req.params.id, req.body?.scheduleId, req.body?.fee);
    await recordAudit({ req, action: "config.update", entityType: "Treatment", entityId: data.id, entityLabel: data.id, after: { scheduleId: data.scheduleId, fee: data.fee } });
    return res.json({ success: true, data });
  } catch (e) { return feeFail(res, e); }
};

export const ownerClearTreatmentPriceController = async (req, res) => {
  try {
    const data = await clearTreatmentPrice(req.params.id, req.params.scheduleId);
    await recordAudit({ req, action: "config.update", entityType: "Treatment", entityId: data.id, entityLabel: data.id, after: { scheduleId: data.scheduleId, cleared: true } });
    return res.json({ success: true, data });
  } catch (e) { return feeFail(res, e); }
};

// ---------- Treatments ----------
export const ownerClinicalCreateTreatmentController = async (req, res) => {
  try {
    const data = await ownerClinicalCreateTreatment(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerClinicalUpdateTreatmentController = async (req, res) => {
  try {
    const data = await ownerClinicalUpdateTreatment(req.user?._id, req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerClinicalToggleTreatmentActiveController = async (req, res) => {
  try {
    const data = await ownerClinicalToggleTreatmentActive(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerClinicalDeleteTreatmentController = async (req, res) => {
  try {
    const data = await ownerClinicalDeleteTreatment(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// ---------- Diagnosis ----------
export const ownerClinicalCreateDiagnosisController = async (req, res) => {
  try {
    const data = await ownerClinicalCreateDiagnosis(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerClinicalUpdateDiagnosisController = async (req, res) => {
  try {
    const data = await ownerClinicalUpdateDiagnosis(req.user?._id, req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerClinicalDeleteDiagnosisController = async (req, res) => {
  try {
    const data = await ownerClinicalDeleteDiagnosis(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// ---------- Findings ----------
export const ownerClinicalCreateFindingController = async (req, res) => {
  try {
    const data = await ownerClinicalCreateFinding(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerClinicalUpdateFindingController = async (req, res) => {
  try {
    const data = await ownerClinicalUpdateFinding(req.user?._id, req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerClinicalDeleteFindingController = async (req, res) => {
  try {
    const data = await ownerClinicalDeleteFinding(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// =========================
// OWNER SETTINGS CONTROLLERS
// =========================
export const ownerSwitchCountryController = async (req, res) => {
  try {
    const { country } = req.body || {};
    if (!country) return res.status(400).json({ success: false, message: "country is required" });
    const data = await ownerSwitchCountry(req.user?._id, country);
    await recordAudit({ req, action: "config.update", entityType: "ClinicConfig", entityLabel: "country", after: { country } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerGetSettingsController = async (req, res) => {
  try {
    const data = await ownerSettingsGet(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerUpdateSettingsController = async (req, res) => {
  try {
    const data = await ownerSettingsUpdate(req.user?._id, req.body || {});
    await recordAudit({ req, action: "settings.update", entityType: "ClinicSettings", entityLabel: "settings", after: { keys: Object.keys(req.body || {}) } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerChangePasswordController = async (req, res) => {
  try {
    const data = await ownerSettingsChangePassword(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// =====================================================
// ✅ OWNER APPOINTMENT CRUD
// =====================================================
export const ownerCreateAppointmentCtrl = async (req, res) => {
  try {
    const data = await ownerCreateAppointment(req.user?._id, req.body || {});
    await recordAudit({ req, action: "appointment.create", entityType: "Appointment", entityId: data?.id, entityLabel: data?.id, after: { status: data?.status, date: data?.date } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateAppointmentCtrl = async (req, res) => {
  try {
    const data = await ownerUpdateAppointment(req.user?._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "appointment.update", entityType: "Appointment", entityId: req.params.id, entityLabel: req.params.id, after: { date: data?.date, time: data?.time, dentistId: data?.dentistId, patientId: data?.patientId, appointmentType: data?.appointmentType || "", status: data?.status } });
    return res.json({ success: true, data });
  } catch (e) {
    // 409 = slot conflict; preserve it so the client can show the right message
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerRescheduleAppointmentCtrl = async (req, res) => {
  try {
    const data = await ownerRescheduleAppointment(req.user?._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "appointment.update", entityType: "Appointment", entityId: req.params.id, entityLabel: req.params.id, after: { rescheduled: true, from: { date: data?.previous?.date, time: data?.previous?.time }, to: { date: data?.date, time: data?.time }, dentistId: data?.dentistId, status: data?.status } });
    return res.json({ success: true, data });
  } catch (e) {
    // 409 = new slot taken; 400 = invalid/absent new time
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateAppointmentStatusCtrl = async (req, res) => {
  try {
    const data = await ownerUpdateAppointmentStatus(req.user?._id, req.params.id, req.body?.status);
    await recordAudit({ req, action: "appointment.status_change", entityType: "Appointment", entityId: req.params.id, entityLabel: req.params.id, after: { status: data?.status, statusLabel: data?.statusLabel, appointmentType: data?.appointmentType || "" } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerDeleteAppointmentCtrl = async (req, res) => {
  try {
    const data = await ownerDeleteAppointment(req.user?._id, req.params.id);
    await recordAudit({ req, action: "appointment.delete", entityType: "Appointment", entityId: req.params.id, entityLabel: req.params.id });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// =====================================================
// ✅ OWNER PATIENT CREATE / UPDATE
// =====================================================
export const ownerCreatePatientCtrl = async (req, res) => {
  try {
    const data = await ownerCreatePatient(req.user?._id, req.body || {});
    // Sensitive-field markers only (never the decrypted values) — insurance
    // and emergency-contact data are PHI-adjacent even though the audit
    // action itself ("patient.create") is the same one already in use.
    await recordAudit({ req, action: "patient.create", entityType: "Patient", entityId: data?.id, entityLabel: data?.name, after: { id: data?.id, name: data?.name, phone: data?.phone, status: data?.status, insuranceSet: Boolean(req.body?.insurance), emergencyContactSet: Boolean(req.body?.emergencyContact), medicalInfoSet: medicalFieldsChanged(req.body) } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerUpdatePatientCtrl = async (req, res) => {
  try {
    const data = await ownerUpdatePatient(req.user?._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "patient.update", entityType: "Patient", entityId: req.params.id, entityLabel: data?.name, after: { id: data?.id, name: data?.name, phone: data?.phone, status: data?.status, insuranceChanged: Boolean(req.body?.insurance), emergencyContactChanged: Boolean(req.body?.emergencyContact), medicalInfoChanged: medicalFieldsChanged(req.body) } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerAppointmentClinicalCtrl = async (req, res) => {
  try {
    const data = await ownerAppointmentClinical(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerUpdateOdontogramCtrl = async (req, res) => {
  try {
    const result = await ownerUpdateOdontogram(req.user?._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "patient.update", entityType: "Patient", entityId: req.params.id, entityLabel: "odontogram", after: { toothNumber: result.entry.toothNumber, condition: result.entry.condition } });
    return res.json({ success: true, data: result.odontogram });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// =====================================================
// ✅ FINANCE CONTROLLERS
// =====================================================

export const ownerFinanceCashbook = async (req, res) => {
  try {
    const { from, to, page, limit, q } = req.query;
    const data = await ownerCashbookData(req.user?._id, { from, to, page, limit, q });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerFinanceCommissions = async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await ownerCommissionData(req.user?._id, { from, to });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerFinanceRecordOwnerPayment = async (req, res) => {
  try {
    const data = await ownerRecordOwnerPayment(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerFinanceListOwnerPayments = async (req, res) => {
  try {
    const { dentistId, page, limit } = req.query;
    const result = await ownerListOwnerPayments(req.user?._id, { dentistId, page, limit });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerFinanceLabDues = async (req, res) => {
  try {
    const data = await ownerLabDuesData(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerFinanceRecordLabPayment = async (req, res) => {
  try {
    const data = await ownerRecordLabPayment(req.user?._id, req.body || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerFinanceLabBillsByLab = async (req, res) => {
  try {
    const { labId } = req.params;
    const { page, limit } = req.query;
    const result = await ownerLabBillsByLab(req.user?._id, labId, { page, limit });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// -------------------- MEDICATIONS --------------------
export const ownerSearchMedicationsCtrl = async (req, res) => {
  try {
    const { q, limit } = req.query;
    const data = await ownerSearchMedications(q, limit);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerCreateMedicationCtrl = async (req, res) => {
  try {
    const data = await ownerCreateOrGetMedication(req.user, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const ownerListMedicationsCtrl = async (req, res) => {
  try {
    const result = await ownerListMedications(req.query);
    return res.json({ success: true, ...result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
