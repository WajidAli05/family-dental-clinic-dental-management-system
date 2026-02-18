import express from "express";
import { getOwnerAppointments,
      ownerListPatients,
  ownerGetPatientProfile,
  ownerDeletePatient,
 } from "../../controllers/owner.controller.js";

const router = express.Router();

// Appointments (Owner)
router.get("/appointments", getOwnerAppointments);

router.get("/patients", ownerListPatients);
router.get("/patients/:id/profile", ownerGetPatientProfile);
router.delete("/patients/:id", ownerDeletePatient);

export default router;