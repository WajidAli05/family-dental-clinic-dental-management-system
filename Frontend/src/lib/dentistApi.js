// const authHeaders = () => {
//   const token = localStorage.getItem("token");
//   return {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${token}`,
//   };
// };

// async function req(path, options = {}) {
//   const res = await fetch(`${BASE}${path}`, {
//     ...options,
//     headers: { ...authHeaders(), ...(options.headers || {}) },
//   });

//   const json = await res.json();
//   if (!res.ok) throw new Error(json?.message || "Request failed");
//   return json;
// }

// export const dentistApi = {
//   getMe: () => req("/me"),

//   updateMe: (payload) =>
//     req("/me", { method: "PATCH", body: JSON.stringify(payload) }),

//   // NOTE: your backend controller uses POST /dentist/change-password (recommended)
//   // If your backend is still /me/password, keep it. Otherwise update to "/change-password".
//   changePassword: ({ currentPassword, newPassword }) =>
//     req("/change-password", {
//       method: "POST",
//       body: JSON.stringify({ currentPassword, newPassword }),
//     }),

//   getStats: () => req("/stats"),

//   // ✅ appointments (date optional)
//   getAppointments: (params = {}) => {
// //     return req(`/appointments${qs(params)}`);
//   },

//   // ✅ lab cases (status/q optional)
//   getCases: (params = {}) => {
// //     return req(`/cases${qs(params)}`);
//   },

//   approveCase: (caseId) =>
//     req(`/cases/${caseId}/approve`, { method: "PATCH" }),

//   // ✅ prescriptions
//   createPrescription: (payload) =>
//     req("/prescriptions", {
//       method: "POST",
//       body: JSON.stringify(payload),
//     }),

//   getPrescriptions: (params = {}) => {
// //     return req(`/prescriptions${qs(params)}`);
//   },

//   getPrescriptionById: (id) => req(`/prescriptions/${id}`),

// updatePrescription: (id, payload) =>
//   req(`/prescriptions/${id}`, {
//     method: "PATCH",
//     body: JSON.stringify(payload),
//   }),
// };

import { handleUnauthorized } from "./httpClient";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/dentist`;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

  const contentType = res.headers.get("content-type") || "";
  let payload;

  // ✅ handle non-json (HTML error pages)
  if (contentType.includes("application/json")) {
    payload = await res.json();
  } else {
    const text = await res.text();
    // show first chunk only (avoid dumping huge html)
    const preview = text?.slice(0, 200);
    throw new Error(
      `API returned non-JSON response (${res.status}). ${preview}`
    );
  }

  if (res.status === 401) handleUnauthorized(`/dentist${path}`);

  // ✅ handle non-2xx
  if (!res.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  // ✅ handle 200 but success:false
  if (payload?.success === false) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload; // { success:true, data: ... }
}


/** Multipart POST — the browser sets Content-Type + boundary itself. */
async function reqMultipart(path, formData) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized(`/dentist${path}`);
  if (!res.ok || json?.success === false) throw new Error(json?.message || `Upload failed: ${res.status}`);
  return json;
}

/** Authenticated binary fetch — the only way file bytes reach the browser. */
async function reqBlob(path, { thumb = false, download = false } = {}) {
  const token = localStorage.getItem("token");
  const sp = new URLSearchParams();
  if (thumb) sp.set("thumb", "1");
  if (download) sp.set("download", "1");
  const res = await fetch(`${BASE}${path}${sp.toString() ? `?${sp}` : ""}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401) handleUnauthorized(`/dentist${path}`);
  if (!res.ok) throw new Error(`Could not load file (${res.status})`);
  return res.blob();
}


/**
 * Query string builder that DROPS undefined/null/"" values.
 *
 * `new URLSearchParams({ category: undefined })` serialises the literal string
 * "undefined", which the API then treats as a real filter value — that is why
 * the dentist documents list came back 200 with zero rows while the owner (who
 * uses a builder that skips blanks) saw 23. Every dentist call goes through
 * this so the bug cannot come back one call site at a time.
 */
const qs = (params = {}) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const out = sp.toString();
  return out ? `?${out}` : "";
};

export const dentistApi = {
  // ── Patient files / imaging ──
  getUploadPolicy: () => req("/file-upload-policy"),
  getConsentTemplates: (lang) => req(`/consent-templates?${new URLSearchParams({ lang: lang || "en" })}`),
  listPatientConsents: (patientId, params = {}) => req(`/patients/${patientId}/consents${qs(params)}`),
  getConsentCoverage: (patientId) => req(`/patients/${patientId}/consent-coverage`),
  createConsent: (patientId, formData) => reqMultipart(`/patients/${patientId}/consents`, formData),
  withdrawConsent: (id, patientId) => req(`/consents/${id}?${new URLSearchParams({ patientId })}`, { method: "DELETE" }),
  listPatientFiles: (patientId, params = {}) => req(`/patients/${patientId}/files${qs(params)}`),
  listPatientXrayTeeth: (patientId) => req(`/patients/${patientId}/xray-teeth`),
  uploadPatientFiles: (patientId, formData) => reqMultipart(`/patients/${patientId}/files`, formData),
  fetchFileBlob: (fileId, opts) => reqBlob(`/files/${fileId}`, opts),
  deletePatientFile: (fileId) => req(`/files/${fileId}`, { method: "DELETE" }),

  getMe: () => req("/me"),

  updateMe: (payload) =>
    req("/me", { method: "PATCH", body: JSON.stringify(payload) }),

  changePassword: ({ currentPassword, newPassword }) =>
    req("/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getStats: (params = {}) => {
    return req(`/stats${qs(params)}`);
  },

  getAppointments: (params = {}) => {
    return req(`/appointments${qs(params)}`);
  },

  createAppointment: (body) =>
    req("/appointments", { method: "POST", body: JSON.stringify(body) }),

  updateAppointment: (id, body) =>
    req(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  updateAppointmentStatus: (id, status) =>
    req(`/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getPatients: (params = {}) => {
    return req(`/patients${qs(params)}`);
  },

  updateOdontogram: (patientId, body) =>
    req(`/patients/${patientId}/odontogram`, { method: "PATCH", body: JSON.stringify(body) }),

  getCases: (params = {}) => {
    return req(`/cases${qs(params)}`);
  },

  updateCaseStatus: (caseId, status) =>
    req(`/cases/${caseId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  createCase: (body) =>
    req("/cases", { method: "POST", body: JSON.stringify(body) }),

  getLabs: () => req("/labs"),

  // ✅ prescriptions
  createPrescription: (payload) =>
    req("/prescriptions", { method: "POST", body: JSON.stringify(payload) }),

  updatePrescription: (id, payload) =>
    req(`/prescriptions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  getPrescriptions: (params = {}) => {
    return req(`/prescriptions${qs(params)}`);
  },

  getPrescriptionById: (id) => req(`/prescriptions/${id}`),

  // Latest prescription per patient (no date filter) — drives button state for all rows
  getPrescriptionsLatestByPatients: (patientIds = []) =>
    req(`/prescriptions/latest-by-patients${qs({ patientIds: patientIds.join(",") })}`),

  // Full history for one patient, newest first — used in modal history panel
  getPatientPrescriptionHistory: (patientId) =>
    req(`/prescriptions/patient-history/${encodeURIComponent(patientId)}`),

  // ── Treatment plans ──
  getPlanFeeSchedules: () => req("/treatment-plans/fee-schedules"),
  getPlanCatalog: (params = {}) => req(`/treatment-plans/catalog${qs(params)}`),
  listTreatmentPlans: (patientId) => req(`/patients/${patientId}/treatment-plans`),
  listPlanAppointments: (patientId) => req(`/patients/${patientId}/plan-appointments`),
  getTreatmentPlan: (id) => req(`/treatment-plans/${id}`),
  createTreatmentPlan: (body) => req("/treatment-plans", { method: "POST", body: JSON.stringify(body) }),
  updateTreatmentPlan: (id, body) => req(`/treatment-plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  setPlanFeeSchedule: (id, feeScheduleId) => req(`/treatment-plans/${id}/fee-schedule`, { method: "PATCH", body: JSON.stringify({ feeScheduleId }) }),
  decideTreatmentPlan: (id, decision) => req(`/treatment-plans/${id}/decision`, { method: "PATCH", body: JSON.stringify({ decision }) }),
  deleteTreatmentPlan: (id) => req(`/treatment-plans/${id}`, { method: "DELETE" }),
  addPlanItem: (id, body) => req(`/treatment-plans/${id}/items`, { method: "POST", body: JSON.stringify(body) }),
  updatePlanItem: (id, itemId, body) => req(`/treatment-plans/${id}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) }),
  removePlanItem: (id, itemId) => req(`/treatment-plans/${id}/items/${itemId}`, { method: "DELETE" }),
  setPlanItemStatus: (id, itemId, status, extra = {}) => req(`/treatment-plans/${id}/items/${itemId}/status`, { method: "PATCH", body: JSON.stringify({ status, ...extra }) }),
  bookAppointmentForPlanItem: (id, itemId, body) => req(`/treatment-plans/${id}/items/${itemId}/book-appointment`, { method: "POST", body: JSON.stringify(body) }),

  getClinicalMaster: () =>
    req("/clinical-master"),

  // ── Price catalog (read-only) ──
  getCatalogTreatments: (params = {}) => {
    return req(`/catalog/treatments${qs(params)}`);
  },

  getCatalogSampleTypes: (params = {}) => {
    return req(`/catalog/sample-types${qs(params)}`);
  },

  // ── My Finance ──
  getFinance: () => req("/finance"),

  // ── Medications ──
  searchMedications: (q) => req(`/medications/search${qs({ q: q || "" })}`),
  createMedication: (body) =>
    req("/medications", { method: "POST", body: JSON.stringify(body) }),
  listMedications: (params = {}) => {
    return req(`/medications${qs(params)}`);
  },
};