import { ownerListAppointments } from "../services/owner.service.js";

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