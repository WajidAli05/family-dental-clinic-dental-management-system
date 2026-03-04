import express from "express";
import { getMyPermissions } from "../../controllers/permissions.controller.js";

const router = express.Router();

// ✅ returns boolean-matrix for FE: { permissions: {key:{dentist:true,..}}, role }
router.get("/my", getMyPermissions);

export default router;