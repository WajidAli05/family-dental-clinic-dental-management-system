import express from "express";
import {
  getReceptionistMe,
  updateReceptionistMe,
  changeReceptionistPassword,
  getReceptionistStats,
  getReceptionistAppointments,
  createReceptionistPatient,
  updateReceptionistPatient,
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
  createInvoice,
  listInventory,
  inventoryStats,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from "../../controllers/receptionist.controller.js";
import { requirePermission } from "../../middlewares/permissions.middleware.js";

const router = express.Router();

// profile
router.get("/me", requirePermission("tab_receptionist_profile"), getReceptionistMe);
router.patch("/me", requirePermission("tab_receptionist_profile"), updateReceptionistMe);
router.patch("/me/password", requirePermission("tab_receptionist_profile"), changeReceptionistPassword);

// dashboard widgets
router.get("/stats", requirePermission("tab_receptionist_dashboard"), getReceptionistStats);

// appointments tab + dashboard may use it too
router.get("/appointments", requirePermission("tab_receptionist_appointments"), getReceptionistAppointments);
router.post("/appointments", requirePermission("tab_receptionist_appointments"), createReceptionistAppointment);
router.patch("/appointments/:id/status", requirePermission("tab_receptionist_appointments"), updateReceptionistAppointmentStatus);

// patients tab
router.get("/patients", requirePermission("tab_receptionist_patients"), getReceptionistPatients);
router.get("/patients/stats", requirePermission("tab_receptionist_patients"), getReceptionistPatientStats);
router.get("/patients/lookup", requirePermission("tab_receptionist_patients"), lookupReceptionistPatient);
router.post("/patients", requirePermission("tab_receptionist_patients"), createReceptionistPatient);
router.patch("/patients/:id", requirePermission("tab_receptionist_patients"), updateReceptionistPatient);

// dentists list (used in appointments tab)
router.get("/dentists", requirePermission("tab_receptionist_appointments"), getReceptionistDentists);

// lab samples tab
router.get("/lab-samples", requirePermission("tab_receptionist_lab_samples"), getReceptionistLabSamples);
router.post("/lab-samples", requirePermission("tab_receptionist_lab_samples"), createReceptionistLabSample);
router.patch("/lab-samples/:id", requirePermission("tab_receptionist_lab_samples"), updateReceptionistLabSample);
router.patch("/lab-samples/:id/status", requirePermission("tab_receptionist_lab_samples"), updateReceptionistLabSampleStatus);
router.patch("/lab-samples/:id/deliver", requirePermission("tab_receptionist_lab_samples"), deliverReceptionistLabSample);
router.delete("/lab-samples/:id", requirePermission("tab_receptionist_lab_samples"), deleteReceptionistLabSample);

// labs/sample types (used by lab samples UI)
router.get("/labs", requirePermission("tab_receptionist_lab_samples"), getReceptionistLabs);
router.get("/sample-types", requirePermission("tab_receptionist_lab_samples"), getReceptionistSampleTypes);

// billing tab
router.get("/invoices", requirePermission("tab_receptionist_billing"), listInvoices);
router.post("/invoices", requirePermission("tab_receptionist_billing"), createInvoice);
router.get("/billing/stats", requirePermission("tab_receptionist_billing"), billingStats);
router.get("/lab-bills", requirePermission("tab_receptionist_billing"), listLabBills);
router.post("/invoices/:id/payments", requirePermission("tab_receptionist_billing"), addInvoicePayment);
router.patch("/invoices/:id/payments/:paymentId", requirePermission("tab_receptionist_billing"), updateInvoicePayment);
router.delete("/invoices/:id/payments/:paymentId", requirePermission("tab_receptionist_billing"), deleteInvoicePayment);

// inventory tab
router.get("/inventory", requirePermission("tab_receptionist_inventory"), listInventory);
router.get("/inventory/stats", requirePermission("tab_receptionist_inventory"), inventoryStats);
router.post("/inventory", requirePermission("tab_receptionist_inventory"), createInventoryItem);
router.patch("/inventory/:id", requirePermission("tab_receptionist_inventory"), updateInventoryItem);
router.delete("/inventory/:id", requirePermission("tab_receptionist_inventory"), deleteInventoryItem);

export default router;