import {
  labGetMe,
  labUpdateMe,
  labGetStats,
  labGetCases,
  labUpdateCaseStatus,
  labUpdateCaseNote,
} from "../services/lab.service.js";

const getLabId = (req) => req.headers["x-lab-id"] || "LAB-USER-1";

export const getLabMe = async (req, res) => {
  try {
    const me = await labGetMe(getLabId(req));
    return res.json({ success: true, data: me });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateLabMe = async (req, res) => {
  try {
    const updated = await labUpdateMe(getLabId(req), req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getLabStats = async (req, res) => {
  try {
    const stats = await labGetStats(getLabId(req));
    return res.json({ success: true, data: stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getLabCases = async (req, res) => {
  try {
    const { status, q, dateFrom, dateTo } = req.query;
    const cases = await labGetCases(getLabId(req), { status, q, dateFrom, dateTo });
    return res.json({ success: true, data: cases });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateLabCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const updated = await labUpdateCaseStatus(getLabId(req), id, { status, note });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateLabCaseNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const updated = await labUpdateCaseNote(getLabId(req), id, note);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};