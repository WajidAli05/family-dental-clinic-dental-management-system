// src/lib/ownerApi.js
import { useUserStore } from "@/store/userStore";
import { handleUnauthorized } from "./httpClient";

const baseURL = import.meta.env.VITE_API_BASE_URL;

function buildUrl(path, params) {
  const url = new URL(baseURL + path);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function request(path, { method = "GET", params, body } = {}) {
  const token = useUserStore.getState().token || localStorage.getItem("token");

  const res = await fetch(buildUrl(path, params), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized(path);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return json; // { success, data }
}

export const ownerApi = {
  // =====================================================
  // ✅ Existing Owner APIs (UNCHANGED)
  // =====================================================

  // dashboard overview
  getDashboardOverview: (params) => request("/owner/dashboard", { params }),

  // appointments
  getAppointments: (params) => request("/owner/appointments", { params }),
  createAppointment: (body) => request("/owner/appointments", { method: "POST", body }),
  updateAppointment: (id, body) => request(`/owner/appointments/${id}`, { method: "PATCH", body }),
  rescheduleAppointment: (id, body) => request(`/owner/appointments/${id}/reschedule`, { method: "PATCH", body }),
  updateAppointmentStatus: (id, status) =>
    request(`/owner/appointments/${id}/status`, { method: "PATCH", body: { status } }),
  deleteAppointment: (id) => request(`/owner/appointments/${id}`, { method: "DELETE" }),

  // patients
  listPatients: (params) => request("/owner/patients", { params }),
  checkPhone: (phone) => request("/owner/patients/phone-check", { params: { phone } }),
  createPatient: (body) => request("/owner/patients", { method: "POST", body }),
  updatePatient: (id, body) => request(`/owner/patients/${id}`, { method: "PATCH", body }),
  getPatientProfile: (patientId) => request(`/owner/patients/${patientId}/profile`),
  updateOdontogram: (patientId, body) => request(`/owner/patients/${patientId}/odontogram`, { method: "PATCH", body }),
  getAppointmentClinical: (apptId) => request(`/owner/appointments/${apptId}/clinical`),
  deletePatient: (patientId) => request(`/owner/patients/${patientId}`, { method: "DELETE" }),
  erasePatient: (patientId, confirm) =>
    request(`/owner/patients/${patientId}/erase`, { method: "POST", body: { confirm } }),

  // dentists + labs
  getDentists: () => request("/owner/dentists"),
  getLabs: () => request("/owner/labs"),

  // billing — invoices (owner create / edit / soft-delete)
  listInvoices: (params) => request("/owner/invoices", { params }),
  createInvoice: (body) => request("/owner/invoices", { method: "POST", body }),
  updateInvoice: (id, body) => request(`/owner/invoices/${id}`, { method: "PATCH", body }),
  deleteInvoice: (id) => request(`/owner/invoices/${id}`, { method: "DELETE" }),
  voidInvoice: (id, reason) => request(`/owner/invoices/${id}/void`, { method: "PATCH", body: { reason } }),
  addInvoicePayment: (id, body) => request(`/owner/invoices/${id}/payments`, { method: "POST", body }),
  updateInvoicePayment: (id, paymentId, body) => request(`/owner/invoices/${id}/payments/${paymentId}`, { method: "PATCH", body }),
  deleteInvoicePayment: (id, paymentId) => request(`/owner/invoices/${id}/payments/${paymentId}`, { method: "DELETE" }),
  getInvoiceFeeSchedules: () => request("/owner/invoice-fee-schedules"),
  getCatalogTreatments: (params) => request("/owner/catalog/treatments", { params }),

  // billing
  getBillingPayments: (params) => request("/owner/billing/payments", { params }),
  getBillingLabBills: (params) => request("/owner/billing/lab-bills", { params }),
  getCommissionRules: () => request("/owner/billing/commission-rules"),
  updateCommissionRules: (body) => request("/owner/billing/commission-rules", { method: "PATCH", body }),
  getARSummary: (params) => request("/owner/billing/ar-summary", { params }),

  // staff management
  listStaff: () => request("/owner/staff"),
  createStaff: (body) => request("/owner/staff", { method: "POST", body }),
  updateStaff: (id, body) => request(`/owner/staff/${id}`, { method: "PATCH", body }),
  deleteStaff: (id) => request(`/owner/staff/${id}`, { method: "DELETE" }),
  toggleStaffEnabled: (id, enabled) =>
    request(`/owner/staff/${id}/enabled`, { method: "PATCH", body: { enabled: !!enabled } }),

  // permissions (role-based matrix)
  getPermissions: () => request("/owner/permissions"),
  updatePermissions: (body) => request("/owner/permissions", { method: "PATCH", body }),

  // =====================================================
  // ✅ Inventory APIs (NEW — additive only)
  // =====================================================
  listInventoryItems: (params) => request("/owner/inventory/items", { params }),
  createInventoryItem: (body) => request("/owner/inventory/items", { method: "POST", body }),
  updateInventoryItem: (id, body) => request(`/owner/inventory/items/${id}`, { method: "PATCH", body }),
  deleteInventoryItem: (id) => request(`/owner/inventory/items/${id}`, { method: "DELETE" }),
  updateInventoryStock: (id, body) => request(`/owner/inventory/items/${id}/stock`, { method: "PATCH", body }),

  listSuppliers: () => request("/owner/inventory/suppliers"),
  listPurchases: () => request("/owner/inventory/purchases"),
  getPurchaseDetails: (purchaseId) => request(`/owner/inventory/purchases/${purchaseId}`),
  createPurchase: (body) => request("/owner/inventory/purchases", { method: "POST", body }),

  listConsumption: () => request("/owner/inventory/consumption"),

  // =====================================================
  // ✅ Clinical Master APIs (NEW — additive only)
  // =====================================================

  // get whole clinical master (single doc). `scheduleId` prices the treatments
  // from that fee schedule via getTreatmentFee; omitted => default schedule.
  getClinicalMaster: (params) => request("/owner/clinical-master", { params }),

  // fee schedules (owner-only, same clinical-master surface)
  listFeeSchedules: () => request("/owner/clinical-master/fee-schedules"),
  createFeeSchedule: (name) => request("/owner/clinical-master/fee-schedules", { method: "POST", body: { name } }),
  renameFeeSchedule: (id, name) => request(`/owner/clinical-master/fee-schedules/${id}`, { method: "PATCH", body: { name } }),
  setDefaultFeeSchedule: (id) => request(`/owner/clinical-master/fee-schedules/${id}/default`, { method: "PATCH" }),
  deleteFeeSchedule: (id) => request(`/owner/clinical-master/fee-schedules/${id}`, { method: "DELETE" }),
  setTreatmentPrice: (treatmentId, scheduleId, fee) =>
    request(`/owner/clinical-master/treatments/${treatmentId}/price`, { method: "PATCH", body: { scheduleId, fee } }),
  clearTreatmentPrice: (treatmentId, scheduleId) =>
    request(`/owner/clinical-master/treatments/${treatmentId}/price/${scheduleId}`, { method: "DELETE" }),

  // treatments
  createClinicalTreatment: (body) => request("/owner/clinical-master/treatments", { method: "POST", body }),
  updateClinicalTreatment: (id, body) => request(`/owner/clinical-master/treatments/${id}`, { method: "PATCH", body }),
  toggleClinicalTreatment: (id) => request(`/owner/clinical-master/treatments/${id}/toggle`, { method: "PATCH" }),
  deleteClinicalTreatment: (id) => request(`/owner/clinical-master/treatments/${id}`, { method: "DELETE" }),

  // clinical diagnosis
  createClinicalDiagnosis: (body) => request("/owner/clinical-master/diagnosis", { method: "POST", body }),
  updateClinicalDiagnosis: (id, body) => request(`/owner/clinical-master/diagnosis/${id}`, { method: "PATCH", body }),
  deleteClinicalDiagnosis: (id) => request(`/owner/clinical-master/diagnosis/${id}`, { method: "DELETE" }),

  // clinical findings
  createClinicalFinding: (body) => request("/owner/clinical-master/findings", { method: "POST", body }),
  updateClinicalFinding: (id, body) => request(`/owner/clinical-master/findings/${id}`, { method: "PATCH", body }),
  deleteClinicalFinding: (id) => request(`/owner/clinical-master/findings/${id}`, { method: "DELETE" }),

    // =====================================================
  // ✅ Settings APIs (NEW)
  // =====================================================
  getOwnerSettings: () => request("/owner/settings"),
  updateOwnerSettings: (body) => request("/owner/settings", { method: "PATCH", body }),
  switchCountry: (country) => request("/owner/settings/country", { method: "PATCH", body: { country } }),
  changeOwnerPassword: (body) => request("/owner/settings/password", { method: "PATCH", body }),

  // =====================================================
  // ✅ Finance APIs (NEW)
  // =====================================================
  getFinanceCashbook: (params) => request("/owner/finance/cashbook", { params }),
  getFinanceCommissions: (params) => request("/owner/finance/commissions", { params }),
  getFinanceOwnerPayments: (params) => request("/owner/finance/commissions/payments", { params }),
  recordOwnerPayment: (body) => request("/owner/finance/commissions/payments", { method: "POST", body }),
  getFinanceLabDues: () => request("/owner/finance/lab-dues"),
  recordLabPayment: (body) => request("/owner/finance/lab-dues/payments", { method: "POST", body }),
  getFinanceLabBillsByLab: (labId, params) => request(`/owner/finance/lab-dues/bills/${labId}`, { params }),
};