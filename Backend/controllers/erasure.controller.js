import { erasePatientPII } from "../services/shared/erasure.js";

// ─── POST /owner/patients/:publicId/erase ─────────────────────────────────────
// Owner-only (route-gated). Irreversible — requires the caller to type the
// exact patient ID as a confirmation phrase, mirroring the restore script's
// typed-confirmation pattern for destructive operations.

export const erasePatient = async (req, res) => {
  const { publicId } = req.params;
  const { confirm } = req.body || {};

  if (confirm !== publicId) {
    return res.status(400).json({
      success: false,
      message: "Confirmation did not match. Type the patient ID exactly to confirm this irreversible action.",
    });
  }

  try {
    const result = await erasePatientPII(req, publicId);
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
};
