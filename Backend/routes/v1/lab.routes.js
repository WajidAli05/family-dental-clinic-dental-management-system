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

// For now, no auth middleware. Later plug in JWT middleware here.
router.get("/me", getLabMe);
router.patch("/me", updateLabMe);

router.get("/stats", getLabStats);
router.get("/cases", getLabCases);
router.patch("/cases/:id/status", updateLabCaseStatus);
router.patch("/cases/:id/note", updateLabCaseNote);

export default router;