import { getClinicConfig, ownerSwitchCountry } from "../services/owner.service.js";

// GET /api/v1/clinic-config — accessible to all authenticated roles
export const getClinicConfigCtrl = async (req, res) => {
  try {
    const data = await getClinicConfig();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PATCH /api/v1/clinic-config/country — accessible to all authenticated roles
export const switchCountryCtrl = async (req, res) => {
  try {
    const { country } = req.body || {};
    if (!country) return res.status(400).json({ success: false, message: "country is required" });
    const data = await ownerSwitchCountry(req.user?._id, country);
    return res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
