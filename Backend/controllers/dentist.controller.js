import {
  dentistGetMe,
  dentistUpdateMe,
  dentistChangePassword,
  dentistGetStats,
  dentistGetAppointments,
  dentistGetCases,
  dentistApproveCase,
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
    const { date } = req.query;
    const rows = await dentistGetAppointments(req.user._id, { date });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getDentistCases = async (req, res) => {
  try {
    const { status, q } = req.query;
    const rows = await dentistGetCases(req.user._id, { status, q });
    return res.json({ success: true, data: rows });
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