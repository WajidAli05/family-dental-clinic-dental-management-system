// Backend/controllers/owner.controller.js
import {
  ownerListAppointments,
  ownerPatientsList,
  ownerPatientProfile,
  ownerPatientDelete,

  ownerListLabAccounts,
  ownerCreateLabAccount,
  ownerUpdateLabAccount,
  ownerSetLabAccountEnabled,

  ownerListLabCases,
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

  // ✅ STAFF + PERMISSIONS
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
} from "../services/owner.service.js";

export const getOwnerAppointments = async (req, res) => {
  try {
    const { dateFrom, dateTo, dentistId, status, q } = req.query;
    const rows = await ownerListAppointments(req.user?._id, { dateFrom, dateTo, dentistId, status, q });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Patients
export const ownerListPatients = async (req, res) => {
  try {
    const data = await ownerPatientsList(req.user?._id);
    return res.json({ success: true, data });
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
    const data = await ownerListLabCases(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
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
    const { dateFrom, dateTo, dentistId } = req.query;
    const data = await ownerBillingPayments(req.user?._id, { dateFrom, dateTo, dentistId });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerBillingListLabBills = async (req, res) => {
  try {
    const { month, labId } = req.query;
    const data = await ownerBillingLabBills(req.user?._id, { month, labId });
    return res.json({ success: true, data });
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
// ✅ STAFF (NEW)
// =====================================================
export const ownerListStaff = async (req, res) => {
  try {
    const data = await ownerStaffList(req.user?._id);
    return res.json({ success: true, data });
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
// ✅ PERMISSIONS (NEW)
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
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// -----------------------------------------------------------------//
// =====================================================
// ✅ INVENTORY (OWNER) — Add-only
// =====================================================
export const ownerInventoryGetItems = async (req, res) => {
  try {
    const data = await ownerInventoryListItems(req.user?._id);
    return res.json({ success: true, data });
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
    const data = await ownerInventoryListSuppliers(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const ownerInventoryGetPurchases = async (req, res) => {
  try {
    const data = await ownerInventoryListPurchases(req.user?._id);
    return res.json({ success: true, data });
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
// ✅ CLINICAL MASTER (OWNER)
// ==============================
export const ownerClinicalMasterGetAllController = async (req, res) => {
  try {
    const data = await ownerClinicalMasterGetAll(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
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