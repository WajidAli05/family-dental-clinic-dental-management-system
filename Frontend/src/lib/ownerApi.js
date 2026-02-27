// src/lib/ownerApi.js
import { useUserStore } from "@/store/userStore";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

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
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return json; // { success, data }
}

export const ownerApi = {
  // =====================================================
  // ✅ Existing Owner APIs (UNCHANGED)
  // =====================================================

  // appointments
  getAppointments: (params) => request("/owner/appointments", { params }),

  // patients
  listPatients: () => request("/owner/patients"),
  getPatientProfile: (patientId) => request(`/owner/patients/${patientId}/profile`),
  deletePatient: (patientId) => request(`/owner/patients/${patientId}`, { method: "DELETE" }),

  // dentists + labs
  getDentists: () => request("/owner/dentists"),
  getLabs: () => request("/owner/labs"),

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

  // get whole clinical master (single doc)
  getClinicalMaster: () => request("/owner/clinical-master"),

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
};