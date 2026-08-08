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
  updateDentistOdontogramCtrl,
  getDentistCases,
  updateDentistCaseStatus,
  getDentistLabsCtrl,
  createDentistCaseCtrl,
  createDentistPrescription,
  updateDentistPrescription,
  getDentistPrescriptions,
  getDentistPrescriptionById,
  getLatestByPatientsCtrl,
  getPatientHistoryCtrl,
  getDentistClinicalMaster,
  getCatalogTreatments,
  getCatalogSampleTypes,
  getDentistFinanceCtrl,
  dentistSearchMedicationsCtrl,
  dentistCreateMedicationCtrl,
  dentistListMedicationsCtrl,
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

// patients (read-only for dentist, except the odontogram which dentists annotate clinically)
router.get("/patients", requirePermission("tab_dentist_patients"), getDentistPatientsCtrl);
router.patch("/patients/:id/odontogram", requirePermission("tab_dentist_patients"), updateDentistOdontogramCtrl);

// lab samples (cases)
router.get("/cases",              requirePermission("tab_dentist_lab_samples"), getDentistCases);
router.post("/cases",             requirePermission("tab_dentist_lab_samples"), createDentistCaseCtrl);
router.patch("/cases/:id/status", requirePermission("tab_dentist_lab_samples"), updateDentistCaseStatus);
// labs list (for add-case modal dropdown)
router.get("/labs", requirePermission("tab_dentist_lab_samples"), getDentistLabsCtrl);

// prescriptions (part of appointments workflow)
router.post("/prescriptions",   requirePermission("tab_dentist_appointments"), createDentistPrescription);
router.get("/prescriptions",    requirePermission("tab_dentist_appointments"), getDentistPrescriptions);
// Static sub-paths must be registered before /:id so Express doesn't absorb them as an id param
router.get("/prescriptions/latest-by-patients",         requirePermission("tab_dentist_appointments"), getLatestByPatientsCtrl);
router.get("/prescriptions/patient-history/:patientId", requirePermission("tab_dentist_appointments"), getPatientHistoryCtrl);
router.get("/prescriptions/:id",   requirePermission("tab_dentist_appointments"), getDentistPrescriptionById);
router.patch("/prescriptions/:id", requirePermission("tab_dentist_appointments"), updateDentistPrescription);

// price catalog (read-only — dentist sees prices when choosing treatments / lab samples)
router.get("/catalog/treatments", requirePermission("tab_dentist_appointments"), getCatalogTreatments);
router.get("/catalog/sample-types", requirePermission("tab_dentist_lab_samples"), getCatalogSampleTypes);

// my finance
router.get("/finance", requirePermission("tab_dentist_finance"), getDentistFinanceCtrl);

// medications catalog (used in prescription flow)
router.get("/medications/search", requirePermission("tab_dentist_appointments"), dentistSearchMedicationsCtrl);
router.post("/medications",        requirePermission("tab_dentist_appointments"), dentistCreateMedicationCtrl);
router.get("/medications",         requirePermission("tab_dentist_appointments"), dentistListMedicationsCtrl);

export default router;