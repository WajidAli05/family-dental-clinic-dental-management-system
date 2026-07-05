import {
  labGetMe,
  labUpdateMe,
  labGetStats,
  labGetCases,
  labUpdateCaseStatus,
  labUpdateCaseNote,
} from "../services/lab.service.js";

export const getLabMe = async (req, res) => {
  try {
    const me = await labGetMe(req.user.publicId);
    return res.json({ success: true, data: me });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateLabMe = async (req, res) => {
  try {
    const updated = await labUpdateMe(req.user.publicId, req.body);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getLabStats = async (req, res) => {
  try {
    const stats = await labGetStats(req.user.publicId);
    return res.json({ success: true, data: stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getLabCases = async (req, res) => {
  try {
    const { status, q, dateFrom, dateTo, page, limit, sortBy, sortDir } = req.query;
    const result = await labGetCases(req.user.publicId, { status, q, dateFrom, dateTo, page, limit, sortBy, sortDir });
    return res.json({ success: true, data: result.rows, total: result.total, page: result.page, pages: result.pages });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateLabCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const updated = await labUpdateCaseStatus(req.user.publicId, id, { status, note });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const updateLabCaseNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const updated = await labUpdateCaseNote(req.user.publicId, id, note);
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
