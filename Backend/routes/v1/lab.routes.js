import express from "express";
import {
  getLabMe,
  updateLabMe,
  getLabStats,
  getLabCases,
  updateLabCaseStatus,
  updateLabCaseNote,
} from "../../controllers/lab.controller.js";

const router = express.Router();

// Auth is applied at the mount point: routes/v1/index.js does
// `router.use("/lab", auth(["lab", "owner"]), labRoutes)`. Every handler
// below relies on req.user being populated by that middleware — do not
// mount this router anywhere else without equivalent protection.
router.get("/me", getLabMe);
router.patch("/me", updateLabMe);

router.get("/stats", getLabStats);
router.get("/cases", getLabCases);
router.patch("/cases/:id/status", updateLabCaseStatus);
router.patch("/cases/:id/note", updateLabCaseNote);

export default router;