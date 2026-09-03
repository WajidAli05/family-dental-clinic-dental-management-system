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

  if (res.status === 401) handleUnauthorized(path);

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }

  return json; // { success, data }
}


/** Multipart POST — never set Content-Type by hand; the browser adds the boundary. */
async function requestMultipart(path, formData) {
  const token = useUserStore.getState().token || localStorage.getItem("token");
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized(path);
  if (!res.ok || json?.success === false) throw new Error(json?.message || `Upload failed: ${res.status}`);
  return json;
}

/** Authenticated binary fetch — the only way file bytes reach the browser. */
async function fetchBlob(path, { thumb = false, download = false } = {}) {
  const token = useUserStore.getState().token || localStorage.getItem("token");
  const qs = new URLSearchParams();
  if (thumb) qs.set("thumb", "1");
  if (download) qs.set("download", "1");
  const res = await fetch(buildUrl(path) + (qs.toString() ? `?${qs}` : ""), {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401) handleUnauthorized(path);
  if (!res.ok) throw new Error(`Could not load file (${res.status})`);
  return res.blob();
}

export const receptionistApi = {
  // ── Patient files / imaging (VIEW ONLY — no write routes exist) ──
  getConsentTemplates: (lang) => request("/receptionist/consent-templates", { params: { lang } }),
  listPatientConsents: (patientId, params) => request(`/receptionist/patients/${patientId}/consents`, { params }),
  getConsentCoverage: (patientId) => request(`/receptionist/patients/${patientId}/consent-coverage`),
  createConsent: (patientId, formData) => requestMultipart(`/receptionist/patients/${patientId}/consents`, formData),
  listPatientFiles: (patientId, params) => request(`/receptionist/patients/${patientId}/files`, { params }),
  listPatientXrayTeeth: (patientId) => request(`/receptionist/patients/${patientId}/xray-teeth`),
  fetchFileBlob: (fileId, opts) => fetchBlob(`/receptionist/files/${fileId}`, opts),

  // Dashboard
  getStats: (params) => request("/receptionist/stats", { params }),
  getAppointments: (params) => request("/receptionist/appointments", { params }),
  getLabSamples: (params) => request("/receptionist/lab-samples", { params }),

  // Patients
  getPatients: (params) => request("/receptionist/patients", { params }),
  getPatientStats: () => request("/receptionist/patients/stats"),
  createPatient: (body) => request("/receptionist/patients", { method: "POST", body }),
  updatePatient: (id, body) =>
    request(`/receptionist/patients/${id}`, { method: "PATCH", body }),
  lookupPatient: (params) => request("/receptionist/patients/lookup", { params }),
  checkPhone: (phone) => request("/receptionist/patients/phone-check", { params: { phone } }),

  // Dentists
  getDentists: () => request("/receptionist/dentists"),

  // Appointments
  createAppointment: (body) => request("/receptionist/appointments", { method: "POST", body }),
  // Full front-desk appointment edit (date/time/dentist/patient/type/reason/notes)
  updateAppointment: (id, body) =>
    request(`/receptionist/appointments/${id}`, { method: "PATCH", body }),
  rescheduleAppointment: (id, body) =>
    request(`/receptionist/appointments/${id}/reschedule`, { method: "PATCH", body }),
  updateAppointmentStatus: (id, body) =>
    request(`/receptionist/appointments/${id}/status`, { method: "PATCH", body }),

  // Lab Samples
  createLabSample: (body) => request("/receptionist/lab-samples", { method: "POST", body }),
  updateLabSample: (id, body) =>
    request(`/receptionist/lab-samples/${id}`, { method: "PATCH", body }),
  updateLabSampleStatus: (id, body) =>
    request(`/receptionist/lab-samples/${id}/status`, { method: "PATCH", body }),
  deliverLabSample: (id) =>
    request(`/receptionist/lab-samples/${id}/deliver`, { method: "PATCH" }),
  deleteLabSample: (id) =>
    request(`/receptionist/lab-samples/${id}`, { method: "DELETE" }),

  // Labs / Sample Types
  getLabs: () => request("/receptionist/labs"),
  getSampleTypes: () => request("/receptionist/sample-types"),

  // ✅ Profile
getMe: () => request("/receptionist/me"),
updateMe: (body) => request("/receptionist/me", { method: "PATCH", body }),
changePassword: (body) =>
  request("/receptionist/me/password", { method: "PATCH", body }),
  // ── Treatment plans (READ-ONLY — no write routes exist for this role) ──
  getPlanFeeSchedules: () => request("/receptionist/treatment-plans/fee-schedules"),
  listTreatmentPlans: (patientId) => request(`/receptionist/patients/${patientId}/treatment-plans`),
  listPlanAppointments: (patientId) => request(`/receptionist/patients/${patientId}/plan-appointments`),
  getTreatmentPlan: (id) => request(`/receptionist/treatment-plans/${id}`),
};