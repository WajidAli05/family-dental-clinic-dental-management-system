import { getClinicConfig } from "../services/owner.service.js";

// GET /api/v1/clinic-config — accessible to all authenticated roles
export const getClinicConfigCtrl = async (req, res) => {
  try {
    const data = await getClinicConfig();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
