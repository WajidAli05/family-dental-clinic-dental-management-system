// Backend/routes/v1/owner.routes.js
import express from "express";
import {
  getOwnerAppointments,

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

  ownerGetDentists,

  ownerBillingListPayments,
  ownerBillingListLabBills,
  ownerBillingGetCommissionRules,
  ownerBillingUpdateCommissionRules,
  ownerBillingARSummary,

  // ✅ NEW
  ownerListStaff,
  ownerCreateStaff,
  ownerUpdateStaff,
  ownerToggleStaffEnabled,
  ownerDeleteStaff,
  ownerGetPermissions,
  ownerUpdatePermissions,

    ownerInventoryGetItems,
  ownerInventoryCreateItemController,
  ownerInventoryUpdateItemController,
  ownerInventoryUpdateStockController,
  ownerInventoryDeleteItemController,
  ownerInventoryGetSuppliers,
  ownerInventoryGetPurchases,
  ownerInventoryGetPurchaseDetails,
  ownerInventoryGetConsumption,
    ownerInventoryCreatePurchaseController,
} from "../../controllers/owner.controller.js";

const router = express.Router();

// Appointments
router.get("/appointments", getOwnerAppointments);

// Patients
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

// Dentists for filters
router.get("/dentists", ownerGetDentists);

// Billing
router.get("/billing/payments", ownerBillingListPayments);
router.get("/billing/lab-bills", ownerBillingListLabBills);
router.get("/billing/commission-rules", ownerBillingGetCommissionRules);
router.patch("/billing/commission-rules", ownerBillingUpdateCommissionRules);
router.get("/billing/ar-summary", ownerBillingARSummary);

// =====================================================
// ✅ STAFF (NEW)
// =====================================================
router.get("/staff", ownerListStaff);
router.post("/staff", ownerCreateStaff);
router.patch("/staff/:id", ownerUpdateStaff);
router.patch("/staff/:id/enabled", ownerToggleStaffEnabled);
router.delete("/staff/:id", ownerDeleteStaff);

// =====================================================
// ✅ PERMISSIONS (NEW)
// =====================================================
router.get("/permissions", ownerGetPermissions);
router.patch("/permissions", ownerUpdatePermissions);

//=================================================
// Invetory related routes
//=================================================
// =====================================================
// ✅ INVENTORY (OWNER)
// =====================================================
router.get("/inventory/items", ownerInventoryGetItems);
router.post("/inventory/items", ownerInventoryCreateItemController);
router.patch("/inventory/items/:id", ownerInventoryUpdateItemController);
router.patch("/inventory/items/:id/stock", ownerInventoryUpdateStockController);
router.delete("/inventory/items/:id", ownerInventoryDeleteItemController);

router.get("/inventory/suppliers", ownerInventoryGetSuppliers); // keep for filters/columns
router.get("/inventory/purchases", ownerInventoryGetPurchases);
router.get("/inventory/purchases/:id", ownerInventoryGetPurchaseDetails);
router.get("/inventory/consumption", ownerInventoryGetConsumption);
router.post("/inventory/purchases", ownerInventoryCreatePurchaseController);

export default router;