import { getAllPermissionsAsMatrix } from "../services/permissions.service.js";

export const getMyPermissions = async (req, res) => {
  try {
    const matrix = await getAllPermissionsAsMatrix();
    return res.json({
      success: true,
      data: {
        permissions: matrix,
        role: req.user?.role,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};