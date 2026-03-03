import express from "express";
import {
  getDentistMe,
  updateDentistMe,
  changeDentistPassword,
  getDentistStats,
  getDentistAppointments,
  getDentistCases,
  approveDentistCase,
  createDentistPrescription,
  updateDentistPrescription,
  getDentistPrescriptions,
  getDentistPrescriptionById,
  getDentistClinicalMaster
} from "../../controllers/dentist.controller.js";

const router = express.Router();

// profile
router.get("/me", getDentistMe);
router.patch("/me", updateDentistMe);
router.patch("/me/password", changeDentistPassword);

router.get("/clinical-master", getDentistClinicalMaster)

// dashboard
router.get("/stats", getDentistStats);
router.get("/appointments", getDentistAppointments);

// lab cases for dentist
router.get("/cases", getDentistCases);
router.patch("/cases/:id/approve", approveDentistCase);

router.post("/prescriptions", createDentistPrescription);
router.get("/prescriptions", getDentistPrescriptions);
router.get("/prescriptions/:id", getDentistPrescriptionById);
router.patch("/prescriptions/:id", updateDentistPrescription);

export default router;