// src/lib/ownerApi.js
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

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
  const token = localStorage.getItem("token");

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
  // appointments
  getAppointments: (params) => request("/owner/appointments", { params }),

  // patients
  listPatients: () => request("/owner/patients"),
  getPatientProfile: (patientId) => request(`/owner/patients/${patientId}/profile`),
  deletePatient: (patientId) => request(`/owner/patients/${patientId}`, { method: "DELETE" }),

  // ✅ owner dentists + labs (for filters)
  getDentists: () => request("/owner/dentists"),
  getLabs: () => request("/owner/labs"),

  // ✅ billing
  getBillingPayments: (params) => request("/owner/billing/payments", { params }),
  getBillingLabBills: (params) => request("/owner/billing/lab-bills", { params }),
  getCommissionRules: () => request("/owner/billing/commission-rules"),
  updateCommissionRules: (body) => request("/owner/billing/commission-rules", { method: "PATCH", body }),
  getARSummary: (params) => request("/owner/billing/ar-summary", { params }),
};