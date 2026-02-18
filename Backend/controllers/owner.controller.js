import { ownerListAppointments,
    ownerPatientsList,
  ownerPatientProfile,
  ownerPatientDelete,
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