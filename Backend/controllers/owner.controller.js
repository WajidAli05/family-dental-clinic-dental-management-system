import { ownerListAppointments,
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
 } from "../services/owner.service.js";

export const getOwnerAppointments = async (req, res) => {
  try {
    const { dateFrom, dateTo, dentistId, status, q } = req.query;

    const rows = await ownerListAppointments(req.user?._id, {
      dateFrom,
      dateTo,
      dentistId,
      status,
      q,
    });

    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /owner/patients
export const ownerListPatients = async (req, res) => {
  try {
    const data = await ownerPatientsList(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /owner/patients/:id/profile
export const ownerGetPatientProfile = async (req, res) => {
  try {
    const data = await ownerPatientProfile(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// DELETE /owner/patients/:id
export const ownerDeletePatient = async (req, res) => {
  try {
    const data = await ownerPatientDelete(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// GET /owner/labs
export const ownerListLabs = async (req, res) => {
  try {
    const data = await ownerListLabAccounts(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /owner/labs
export const ownerCreateLab = async (req, res) => {
  try {
    const data = await ownerCreateLabAccount(req.user?._id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// PATCH /owner/labs/:id
export const ownerUpdateLab = async (req, res) => {
  try {
    const data = await ownerUpdateLabAccount(req.user?._id, req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// PATCH /owner/labs/:id/enabled
export const ownerToggleLabEnabled = async (req, res) => {
  try {
    const enabled = !!req.body?.enabled;
    const data = await ownerSetLabAccountEnabled(req.user?._id, req.params.id, enabled);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// GET /owner/lab-cases
export const ownerListLabCasesController = async (req, res) => {
  try {
    const data = await ownerListLabCases(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /owner/sample-types
export const ownerListSampleTypesController = async (req, res) => {
  try {
    const data = await ownerListSampleTypes(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /owner/sample-types
export const ownerCreateSampleTypeController = async (req, res) => {
  try {
    const data = await ownerCreateSampleType(req.user?._id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// PATCH /owner/sample-types/:id
export const ownerUpdateSampleTypeController = async (req, res) => {
  try {
    const data = await ownerUpdateSampleType(req.user?._id, req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// DELETE /owner/sample-types/:id
export const ownerDeleteSampleTypeController = async (req, res) => {
  try {
    const data = await ownerDeleteSampleType(req.user?._id, req.params.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const ownerGetDentists = async (req, res) => {
  try {
    const data = await ownerListDentists(req.user?._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// --- BILLING & FINANCIALS (Owner) ---

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

// NEW: A/R summary
export const ownerBillingARSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await ownerBillingARSummaryService(req.user?._id, { dateFrom, dateTo });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};