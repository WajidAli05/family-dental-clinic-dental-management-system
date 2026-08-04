// Backend/routes/v1/owner.routes.js
import express from "express";
import {
  ownerGetDashboardOverview,
  getOwnerAppointments,
  ownerCreateAppointmentCtrl,
  ownerUpdateAppointmentCtrl,
  ownerUpdateAppointmentStatusCtrl,
  ownerDeleteAppointmentCtrl,

  ownerListPatients,
  ownerGetPatientProfile,
  ownerDeletePatient,
  ownerCreatePatientCtrl,
  ownerUpdatePatientCtrl,

  ownerListLabs,
  ownerCreateLab,
  ownerUpdateLab,
  ownerToggleLabEnabled,

  ownerListLabCasesController,
  ownerGetLabCaseController,
  ownerCreateLabCaseController,
  ownerUpdateLabCaseController,
  ownerDeleteLabCaseController,
  ownerUpdateLabCaseStatusController,

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

  ownerFinanceCashbook,
  ownerFinanceCommissions,
  ownerFinanceRecordOwnerPayment,
  ownerFinanceListOwnerPayments,
  ownerFinanceLabDues,
  ownerFinanceRecordLabPayment,
  ownerFinanceLabBillsByLab,

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

      ownerClinicalMasterGetAllController,

  ownerClinicalCreateTreatmentController,
  ownerClinicalUpdateTreatmentController,
  ownerClinicalToggleTreatmentActiveController,
  ownerClinicalDeleteTreatmentController,

  ownerClinicalCreateDiagnosisController,
  ownerClinicalUpdateDiagnosisController,
  ownerClinicalDeleteDiagnosisController,

  ownerClinicalCreateFindingController,
  ownerClinicalUpdateFindingController,
  ownerClinicalDeleteFindingController,

    ownerGetSettingsController,
  ownerUpdateSettingsController,
  ownerChangePasswordController,
  ownerSwitchCountryController,

  ownerSearchMedicationsCtrl,
  ownerCreateMedicationCtrl,
  ownerListMedicationsCtrl,
  phoneCheckOwnerPatients,
} from "../../controllers/owner.controller.js";
import { getLockedAccounts, manualUnlock, getStaffLoginHistory } from "../../controllers/security.controller.js";
import { getNotifications, markRead, markAllRead } from "../../controllers/notifications.controller.js";

const router = express.Router();

// Dashboard overview
router.get("/dashboard", ownerGetDashboardOverview);

// Appointments
router.get("/appointments",              getOwnerAppointments);
router.post("/appointments",             ownerCreateAppointmentCtrl);
router.patch("/appointments/:id",        ownerUpdateAppointmentCtrl);
router.patch("/appointments/:id/status", ownerUpdateAppointmentStatusCtrl);
router.delete("/appointments/:id",       ownerDeleteAppointmentCtrl);

// Patients
router.get("/patients",                  ownerListPatients);
router.get("/patients/phone-check",      phoneCheckOwnerPatients);
router.post("/patients",                 ownerCreatePatientCtrl);
router.get("/patients/:id/profile",      ownerGetPatientProfile);
router.patch("/patients/:id",      ownerUpdatePatientCtrl);
router.delete("/patients/:id",     ownerDeletePatient);

// Lab accounts
router.get("/labs", ownerListLabs);
router.post("/labs", ownerCreateLab);
router.patch("/labs/:id", ownerUpdateLab);
router.patch("/labs/:id/enabled", ownerToggleLabEnabled);

// Lab cases
router.get("/lab-cases",               ownerListLabCasesController);
router.post("/lab-cases",              ownerCreateLabCaseController);
router.get("/lab-cases/:id",           ownerGetLabCaseController);
router.patch("/lab-cases/:id",         ownerUpdateLabCaseController);
router.delete("/lab-cases/:id",        ownerDeleteLabCaseController);
router.patch("/lab-cases/:id/status",  ownerUpdateLabCaseStatusController);

// Sample types
router.get("/sample-types", ownerListSampleTypesController);
router.post("/sample-types", ownerCreateSampleTypeController);
router.patch("/sample-types/:id", ownerUpdateSampleTypeController);
router.delete("/sample-types/:id", ownerDeleteSampleTypeController);

// Dentists for filters
router.get("/dentists", ownerGetDentists);

// Billing (legacy endpoints — kept for backwards compatibility)
router.get("/billing/payments", ownerBillingListPayments);
router.get("/billing/lab-bills", ownerBillingListLabBills);
router.get("/billing/commission-rules", ownerBillingGetCommissionRules);
router.patch("/billing/commission-rules", ownerBillingUpdateCommissionRules);
router.get("/billing/ar-summary", ownerBillingARSummary);

// Finance (new endpoints)
router.get("/finance/cashbook",                 ownerFinanceCashbook);
router.get("/finance/commissions",              ownerFinanceCommissions);
router.get("/finance/commissions/payments",     ownerFinanceListOwnerPayments);
router.post("/finance/commissions/payments",    ownerFinanceRecordOwnerPayment);
router.get("/finance/lab-dues",                 ownerFinanceLabDues);
router.post("/finance/lab-dues/payments",       ownerFinanceRecordLabPayment);
router.get("/finance/lab-dues/bills/:labId",    ownerFinanceLabBillsByLab);

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

// ==============================
// ✅ CLINICAL MASTER (OWNER)
// ==============================
router.get("/clinical-master", ownerClinicalMasterGetAllController);

// Treatments
router.post("/clinical-master/treatments", ownerClinicalCreateTreatmentController);
router.patch("/clinical-master/treatments/:id", ownerClinicalUpdateTreatmentController);
router.patch("/clinical-master/treatments/:id/toggle", ownerClinicalToggleTreatmentActiveController);
router.delete("/clinical-master/treatments/:id", ownerClinicalDeleteTreatmentController);

// Diagnosis templates
router.post("/clinical-master/diagnosis", ownerClinicalCreateDiagnosisController);
router.patch("/clinical-master/diagnosis/:id", ownerClinicalUpdateDiagnosisController);
router.delete("/clinical-master/diagnosis/:id", ownerClinicalDeleteDiagnosisController);

// Clinical findings
router.post("/clinical-master/findings", ownerClinicalCreateFindingController);
router.patch("/clinical-master/findings/:id", ownerClinicalUpdateFindingController);
router.delete("/clinical-master/findings/:id", ownerClinicalDeleteFindingController);

// =====================================================
// ✅ SETTINGS (OWNER)
// =====================================================
router.get("/settings", ownerGetSettingsController);
router.patch("/settings", ownerUpdateSettingsController);
router.patch("/settings/country", ownerSwitchCountryController);
router.patch("/settings/password", ownerChangePasswordController);

// =====================================================
// ✅ MEDICATIONS
// =====================================================
router.get("/medications/search", ownerSearchMedicationsCtrl);
router.post("/medications",        ownerCreateMedicationCtrl);
router.get("/medications",         ownerListMedicationsCtrl);

// =====================================================
// ✅ SECURITY (lockout management)
// =====================================================
router.get("/security/locked-accounts",         getLockedAccounts);
router.post("/security/unlock/:userId",         manualUnlock);
router.get("/security/login-history/:publicId", getStaffLoginHistory);

// =====================================================
// ✅ NOTIFICATIONS
// =====================================================
router.get("/notifications",               getNotifications);
router.patch("/notifications/read-all",    markAllRead);
router.patch("/notifications/:id/read",    markRead);

export default router;