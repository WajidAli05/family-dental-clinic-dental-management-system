import {
  receptionistGetMe,
  receptionistUpdateMe,
  receptionistChangePassword,
  receptionistGetStats,
  receptionistGetAppointments,
  receptionistGetLabSamples,
  receptionistCreatePatient,
  receptionistCreateAppointment,
    receptionistGetPatients,
  receptionistGetPatientStats,
} from "../services/receptionist.service.js";

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

export const getReceptionistAppointments = async (req, res) => {
  try {
    const { date } = req.query;
    const rows = await receptionistGetAppointments(req.user._id, { date });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getReceptionistLabSamples = async (req, res) => {
  try {
    const { date } = req.query;
    const rows = await receptionistGetLabSamples(req.user._id, { date });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// quick actions used by modals
export const createReceptionistPatient = async (req, res) => {
  try {
    const created = await receptionistCreatePatient(req.user, req.body);
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const createReceptionistAppointment = async (req, res) => {
  try {
    const created = await receptionistCreateAppointment(req.user, req.body);
    return res.json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getReceptionistPatients = async (req, res) => {
  try {
    const { q, limit, page } = req.query;
    const rows = await receptionistGetPatients(req.user._id, { q, limit, page });
    return res.json({ success: true, data: rows });
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