import {
  dentistGetMe,
  dentistUpdateMe,
  dentistChangePassword,
  dentistGetStats,
  dentistGetAppointments,
  dentistGetCases,
  dentistApproveCase,
  dentistCreatePrescription,
  dentistUpdatePrescription,
  dentistGetPrescriptions,
  dentistGetPrescriptionById,
  dentistGetClinicalMaster
} from "../services/dentist.service.js";

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
    const stats = await dentistGetStats(req.user._id);
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

export const getDentistCases = async (req, res) => {
  try {
    const { status, q, page, limit, sortBy, sortDir } = req.query;
    const result = await dentistGetCases(req.user._id, { status, q, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const approveDentistCase = async (req, res) => {
  try {
    const { id } = req.params; // CASE-2001
    const updated = await dentistApproveCase(req.user._id, id);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// âœ… PRESCRIPTIONS
export const createDentistPrescription = async (req, res) => {
  try {
    const created = await dentistCreatePrescription(req.user, req.body);
    res.json({ success: true, data: created });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updateDentistPrescription = async (req, res) => {
  try {
    const updated = await dentistUpdatePrescription(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
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

export const getDentistClinicalMaster = async (req, res) => {
  try {
    const data = await dentistGetClinicalMaster();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
