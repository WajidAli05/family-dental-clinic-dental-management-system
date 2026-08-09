import {
  dentistGetMe,
  dentistUpdateMe,
  dentistChangePassword,
  dentistGetStats,
  dentistGetAppointments,
  dentistCreateAppointment,
  dentistUpdateAppointment,
  dentistUpdateAppointmentStatus,
  dentistGetCases,
  dentistUpdateCaseStatus,
  dentistGetLabs,
  dentistCreateCase,
  dentistCreatePrescription,
  dentistUpdatePrescription,
  dentistGetPrescriptions,
  dentistGetPrescriptionById,
  dentistGetLatestByPatients,
  dentistGetPatientHistory,
  dentistGetClinicalMaster,
  dentistGetPatients,
  dentistUpdateOdontogram,
  dentistGetFinance,
  dentistSearchMedications,
  dentistCreateOrGetMedication,
  dentistListMedications,
} from "../services/dentist.service.js";

import { getActiveTreatments, getActiveSampleTypes } from "../services/shared/catalog.js";
import { recordAudit } from "../services/shared/audit.js";

export const getDentistMe = async (req, res) => {
  try {
    const me = await dentistGetMe(req.user._id);
    return res.json({ success: true, data: me });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateDentistMe = async (req, res) => {
  try {
    const updated = await dentistUpdateMe(req.user._id, req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const changeDentistPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const updated = await dentistChangePassword(req.user._id, { currentPassword, newPassword });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getDentistStats = async (req, res) => {
  try {
    const stats = await dentistGetStats(req.user._id, { date: req.query.date });
    return res.json({ success: true, data: stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getDentistAppointments = async (req, res) => {
  try {
    const { date, page, limit, sortBy, sortDir } = req.query;
    const result = await dentistGetAppointments(req.user._id, { date, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const createDentistAppointmentCtrl = async (req, res) => {
  try {
    const data = await dentistCreateAppointment(req.user._id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateDentistAppointmentCtrl = async (req, res) => {
  try {
    const data = await dentistUpdateAppointment(req.user._id, req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const updateDentistAppointmentStatusCtrl = async (req, res) => {
  try {
    const data = await dentistUpdateAppointmentStatus(req.user._id, req.params.id, req.body?.status);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const getDentistPatientsCtrl = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir, q } = req.query;
    const result = await dentistGetPatients(req.user._id, { page, limit, sortBy, sortDir, q });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateDentistOdontogramCtrl = async (req, res) => {
  try {
    const result = await dentistUpdateOdontogram(req.user._id, req.params.id, req.body || {});
    await recordAudit({ req, action: "patient.update", entityType: "Patient", entityId: req.params.id, entityLabel: "odontogram", after: { toothNumber: result.entry.toothNumber, condition: result.entry.condition } });
    return res.json({ success: true, data: result.odontogram });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const getDentistCases = async (req, res) => {
  try {
    const { status, q, page, limit, sortBy, sortDir } = req.query;
    const result = await dentistGetCases(req.user._id, { status, q, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateDentistCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required" });
    const updated = await dentistUpdateCaseStatus(req.user._id, id, status);
    await recordAudit({ req, action: "labcase.status_change", entityType: "LabCase", entityId: id, entityLabel: id, after: { status } });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const getDentistLabsCtrl = async (req, res) => {
  try {
    const data = await dentistGetLabs();
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const createDentistCaseCtrl = async (req, res) => {
  try {
    const data = await dentistCreateCase(req.user._id, req.body);
    await recordAudit({ req, action: "labcase.create", entityType: "LabCase", entityId: data?.id, entityLabel: data?.id, after: { status: data?.status } });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

// âœ… PRESCRIPTIONS
export const createDentistPrescription = async (req, res) => {
  try {
    const created = await dentistCreatePrescription(req.user, req.body);
    // PHI safety: omit diagnosis/clinicalFinding/treatment/notes from snapshot
    await recordAudit({ req, action: "prescription.create", entityType: "Prescription", entityId: created?.id, entityLabel: created?.id, after: { id: created?.id, patientId: created?.patientId, appointmentId: created?.appointmentId || "", date: created?.date, medicationCount: created?.medications?.length ?? 0, toothCount: created?.toothEntries?.length ?? 0, teeth: (created?.toothEntries || []).map((e) => e.toothNumber), xrayRequestedTeeth: (created?.toothEntries || []).filter((e) => e.xrayRequested).map((e) => e.toothNumber) } });
    res.json({ success: true, data: created });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const updateDentistPrescription = async (req, res) => {
  try {
    const updated = await dentistUpdatePrescription(req.user, req.params.id, req.body);
    // PHI safety: omit diagnosis/clinicalFinding/treatment/notes from snapshot
    await recordAudit({ req, action: "prescription.update", entityType: "Prescription", entityId: req.params.id, entityLabel: req.params.id, after: { id: updated?.id, patientId: updated?.patientId, appointmentId: updated?.appointmentId || "", date: updated?.date, medicationCount: updated?.medications?.length ?? 0, toothCount: updated?.toothEntries?.length ?? 0, teeth: (updated?.toothEntries || []).map((e) => e.toothNumber), xrayRequestedTeeth: (updated?.toothEntries || []).filter((e) => e.xrayRequested).map((e) => e.toothNumber) } });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const getDentistPrescriptions = async (req, res) => {
  try {
    const result = await dentistGetPrescriptions(req.user, req.query);
    res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const getDentistPrescriptionById = async (req, res) => {
  try {
    const row = await dentistGetPrescriptionById(req.user, req.params.id);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Latest prescription per patient (batch, no date filter) — for button-state hydration
export const getLatestByPatientsCtrl = async (req, res) => {
  try {
    const patientIds = String(req.query.patientIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const data = await dentistGetLatestByPatients(req.user, patientIds);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Full prescription history for one patient, newest first — for the modal history panel
export const getPatientHistoryCtrl = async (req, res) => {
  try {
    const data = await dentistGetPatientHistory(req.user, req.params.patientId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const getDentistClinicalMaster = async (req, res) => {
  try {
    const data = await dentistGetClinicalMaster();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Catalog (read-only price catalog for dentist) ──
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

export const getDentistFinanceCtrl = async (req, res) => {
  try {
    const data = await dentistGetFinance(req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

// -------------------- MEDICATIONS --------------------
export const dentistSearchMedicationsCtrl = async (req, res) => {
  try {
    const { q, limit } = req.query;
    const data = await dentistSearchMedications(q, limit);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const dentistCreateMedicationCtrl = async (req, res) => {
  try {
    const data = await dentistCreateOrGetMedication(req.user, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};

export const dentistListMedicationsCtrl = async (req, res) => {
  try {
    const result = await dentistListMedications(req.query);
    return res.json({ success: true, ...result });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
