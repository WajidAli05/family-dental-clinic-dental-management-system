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
import { requirePermission } from "../../middlewares/permissions.middleware.js";

const router = express.Router();

// profile
router.get("/me", requirePermission("tab_dentist_profile"), getDentistMe);
router.patch("/me", requirePermission("tab_dentist_profile"), updateDentistMe);
router.patch("/me/password", requirePermission("tab_dentist_profile"), changeDentistPassword);

// clinical master (used inside appointments/prescriptions flow)
router.get("/clinical-master", requirePermission("tab_dentist_appointments"), getDentistClinicalMaster);

// dashboard
router.get("/stats", requirePermission("tab_dentist_dashboard"), getDentistStats);

// appointments
router.get("/appointments", requirePermission("tab_dentist_appointments"), getDentistAppointments);

// lab samples (cases)
router.get("/cases", requirePermission("tab_dentist_lab_samples"), getDentistCases);
router.patch("/cases/:id/approve", requirePermission("tab_dentist_lab_samples"), approveDentistCase);

// prescriptions (part of appointments workflow)
router.post("/prescriptions", requirePermission("tab_dentist_appointments"), createDentistPrescription);
router.get("/prescriptions", requirePermission("tab_dentist_appointments"), getDentistPrescriptions);
router.get("/prescriptions/:id", requirePermission("tab_dentist_appointments"), getDentistPrescriptionById);
router.patch("/prescriptions/:id", requirePermission("tab_dentist_appointments"), updateDentistPrescription);

export default router;