import express from "express";
import {
  getDentistMe,
  updateDentistMe,
  changeDentistPassword,
  getDentistStats,
  getDentistAppointments,
  createDentistAppointmentCtrl,
  updateDentistAppointmentCtrl,
  updateDentistAppointmentStatusCtrl,
  getDentistPatientsCtrl,
  getDentistCases,
  updateDentistCaseStatus,
  getDentistLabsCtrl,
  createDentistCaseCtrl,
  createDentistPrescription,
  updateDentistPrescription,
  getDentistPrescriptions,
  getDentistPrescriptionById,
  getDentistClinicalMaster,
  getCatalogTreatments,
  getCatalogSampleTypes,
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
router.get("/appointments",                requirePermission("tab_dentist_appointments"), getDentistAppointments);
router.post("/appointments",               requirePermission("tab_dentist_appointments"), createDentistAppointmentCtrl);
router.patch("/appointments/:id",          requirePermission("tab_dentist_appointments"), updateDentistAppointmentCtrl);
router.patch("/appointments/:id/status",   requirePermission("tab_dentist_appointments"), updateDentistAppointmentStatusCtrl);

// patients (read-only for dentist)
router.get("/patients", requirePermission("tab_dentist_patients"), getDentistPatientsCtrl);

// lab samples (cases)
router.get("/cases",              requirePermission("tab_dentist_lab_samples"), getDentistCases);
router.post("/cases",             requirePermission("tab_dentist_lab_samples"), createDentistCaseCtrl);
router.patch("/cases/:id/status", requirePermission("tab_dentist_lab_samples"), updateDentistCaseStatus);
// labs list (for add-case modal dropdown)
router.get("/labs", requirePermission("tab_dentist_lab_samples"), getDentistLabsCtrl);

// prescriptions (part of appointments workflow)
router.post("/prescriptions", requirePermission("tab_dentist_appointments"), createDentistPrescription);
router.get("/prescriptions", requirePermission("tab_dentist_appointments"), getDentistPrescriptions);
router.get("/prescriptions/:id", requirePermission("tab_dentist_appointments"), getDentistPrescriptionById);
router.patch("/prescriptions/:id", requirePermission("tab_dentist_appointments"), updateDentistPrescription);

// price catalog (read-only — dentist sees prices when choosing treatments / lab samples)
router.get("/catalog/treatments", requirePermission("tab_dentist_appointments"), getCatalogTreatments);
router.get("/catalog/sample-types", requirePermission("tab_dentist_lab_samples"), getCatalogSampleTypes);

export default router;