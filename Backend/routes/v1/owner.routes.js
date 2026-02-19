import express from "express";
import { getOwnerAppointments,
      ownerListPatients,
  ownerGetPatientProfile,
  ownerDeletePatient,
    ownerListLabs,
  ownerCreateLab,
  ownerUpdateLab,
  ownerToggleLabEnabled,
  ownerListLabCasesController,
  ownerListSampleTypesController,
  ownerCreateSampleTypeController,
  ownerUpdateSampleTypeController,
  ownerDeleteSampleTypeController,
 } from "../../controllers/owner.controller.js";

const router = express.Router();

// Appointments (Owner)
router.get("/appointments", getOwnerAppointments);

router.get("/patients", ownerListPatients);
router.get("/patients/:id/profile", ownerGetPatientProfile);
router.delete("/patients/:id", ownerDeletePatient);

// Lab accounts
router.get("/labs", ownerListLabs);
router.post("/labs", ownerCreateLab);
router.patch("/labs/:id", ownerUpdateLab);
router.patch("/labs/:id/enabled", ownerToggleLabEnabled);

// Lab cases
router.get("/lab-cases", ownerListLabCasesController);

// Sample types
router.get("/sample-types", ownerListSampleTypesController);
router.post("/sample-types", ownerCreateSampleTypeController);
router.patch("/sample-types/:id", ownerUpdateSampleTypeController);
router.delete("/sample-types/:id", ownerDeleteSampleTypeController);

export default router;