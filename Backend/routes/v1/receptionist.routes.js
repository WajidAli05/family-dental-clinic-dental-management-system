import express from "express";
import {
  getReceptionistMe,
  updateReceptionistMe,
  changeReceptionistPassword,
  getReceptionistStats,
  getReceptionistAppointments,
  getReceptionistLabSamples,
  createReceptionistPatient,
  createReceptionistAppointment,
    getReceptionistPatients,
  getReceptionistPatientStats,
  getReceptionistDentists,
  lookupReceptionistPatient,
} from "../../controllers/receptionist.controller.js";

const router = express.Router();

// profile
router.get("/me", getReceptionistMe);
router.patch("/me", updateReceptionistMe);
router.patch("/me/password", changeReceptionistPassword);

// dashboard
router.get("/stats", getReceptionistStats);
router.get("/appointments", getReceptionistAppointments);
router.get("/lab-samples", getReceptionistLabSamples);

// quick actions (modals)
router.post("/patients", createReceptionistPatient);
router.post("/appointments", createReceptionistAppointment);

// Patients
router.get("/patients", getReceptionistPatients);
router.get("/patients/stats", getReceptionistPatientStats);

router.get("/dentists", getReceptionistDentists);
router.get("/patients/lookup", lookupReceptionistPatient);

export default router;