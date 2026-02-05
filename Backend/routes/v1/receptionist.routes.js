import express from "express";
import {
  getReceptionistMe,
  updateReceptionistMe,
  changeReceptionistPassword,
  getReceptionistStats,
  getReceptionistAppointments,
  createReceptionistPatient,
  createReceptionistAppointment,
    getReceptionistPatients,
  getReceptionistPatientStats,
  getReceptionistDentists,
  lookupReceptionistPatient,
  updateReceptionistAppointmentStatus,

    getReceptionistLabSamples,
  createReceptionistLabSample,
  updateReceptionistLabSample,
  updateReceptionistLabSampleStatus,
  deliverReceptionistLabSample,
  deleteReceptionistLabSample,

  getReceptionistLabs,
  getReceptionistSampleTypes,

  listInvoices,
  billingStats,
  listLabBills,
  addInvoicePayment,
  updateInvoicePayment,
  deleteInvoicePayment,
  createInvoice
} from "../../controllers/receptionist.controller.js";

const router = express.Router();

// profile
router.get("/me", getReceptionistMe);
router.patch("/me", updateReceptionistMe);
router.patch("/me/password", changeReceptionistPassword);

// dashboard
router.get("/stats", getReceptionistStats);
router.get("/appointments", getReceptionistAppointments);

// quick actions (modals)
router.post("/patients", createReceptionistPatient);
router.post("/appointments", createReceptionistAppointment);

// Patients
router.get("/patients", getReceptionistPatients);
router.get("/patients/stats", getReceptionistPatientStats);

router.get("/dentists", getReceptionistDentists);
router.get("/patients/lookup", lookupReceptionistPatient);

router.patch("/appointments/:id/status", updateReceptionistAppointmentStatus);

router.get("/lab-samples", getReceptionistLabSamples);
router.post("/lab-samples", createReceptionistLabSample);
router.patch("/lab-samples/:id", updateReceptionistLabSample);
router.patch("/lab-samples/:id/status", updateReceptionistLabSampleStatus);
router.patch("/lab-samples/:id/deliver", deliverReceptionistLabSample);
router.delete("/lab-samples/:id", deleteReceptionistLabSample);

router.get("/labs", getReceptionistLabs);
router.get("/sample-types", getReceptionistSampleTypes);

router.get("/invoices", listInvoices);
router.get("/billing/stats", billingStats);
router.get("/lab-bills", listLabBills);

router.post("/invoices/:id/payments", addInvoicePayment);
router.patch("/invoices/:id/payments/:paymentId", updateInvoicePayment);
router.delete("/invoices/:id/payments/:paymentId", deleteInvoicePayment);
router.post("/invoices", createInvoice);

export default router;