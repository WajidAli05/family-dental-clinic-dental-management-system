// const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// function buildUrl(path, params) {
//   const url = new URL(baseURL + path);
//   if (params && typeof params === "object") {
//     Object.entries(params).forEach(([k, v]) => {
//       if (v === undefined || v === null || v === "") return;
//       url.searchParams.set(k, String(v));
//     });
//   }
//   return url.toString();
// }

// async function request(path, { method = "GET", params, body } = {}) {
//   const token = localStorage.getItem("token");

//   const res = await fetch(buildUrl(path, params), {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: body ? JSON.stringify(body) : undefined,
//   });

//   const json = await res.json().catch(() => ({}));

//   // Normalize errors
//   if (!res.ok || json?.success === false) {
//     const msg = json?.message || `Request failed: ${res.status}`;
//     throw new Error(msg);
//   }

//   return json; // { success, data }
// }

// export const receptionistApi = {
//   // GETs
//   getStats: (params) => request("/receptionist/stats", { params }),
//   getAppointments: (params) => request("/receptionist/appointments", { params }),
//   getLabSamples: (params) => request("/receptionist/lab-samples", { params }),

//   // POSTs
//   createPatient: (body) =>
//     request("/receptionist/patients", { method: "POST", body }),
//   createAppointment: (body) =>
//     request("/receptionist/appointments", { method: "POST", body }),

//   // add these into receptionistApi:
//     getPatients: (params) => request("/receptionist/patients", { params }),
//     getPatientStats: () => request("/receptionist/patients/stats"),
//     createPatient: (body) => request("/receptionist/patients", { method: "POST", body }),
//     getDentists: () => request("/receptionist/dentists"),
// lookupPatient: (params) => request("/receptionist/patients/lookup", { params }),
// createAppointment: (body) =>
//   request("/receptionist/appointments", { method: "POST", body }),

// getAppointments: (params) => request("/receptionist/appointments", { params }),
// updateAppointmentStatus: (id, body) =>
//   request(`/receptionist/appointments/${id}/status`, { method: "PATCH", body }),


// getLabSamples: (params) => request("/receptionist/lab-samples", { params }),
// createLabSample: (body) => request("/receptionist/lab-samples", { method: "POST", body }),
// updateLabSample: (id, body) => request(`/receptionist/lab-samples/${id}`, { method: "PATCH", body }),
// updateLabSampleStatus: (id, body) => request(`/receptionist/lab-samples/${id}/status`, { method: "PATCH", body }),
// deliverLabSample: (id) => request(`/receptionist/lab-samples/${id}/deliver`, { method: "PATCH" }),
// deleteLabSample: (id) => request(`/receptionist/lab-samples/${id}`, { method: "DELETE" }),

// getLabs: () => request("/receptionist/labs"),
// getSampleTypes: () => request("/receptionist/sample-types"),
// };

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

export const receptionistApi = {
  // Dashboard
  getStats: (params) => request("/receptionist/stats", { params }),
  getAppointments: (params) => request("/receptionist/appointments", { params }),
  getLabSamples: (params) => request("/receptionist/lab-samples", { params }),

  // Patients
  getPatients: (params) => request("/receptionist/patients", { params }),
  getPatientStats: () => request("/receptionist/patients/stats"),
  createPatient: (body) => request("/receptionist/patients", { method: "POST", body }),
  lookupPatient: (params) => request("/receptionist/patients/lookup", { params }),

  // Dentists
  getDentists: () => request("/receptionist/dentists"),

  // Appointments
  createAppointment: (body) => request("/receptionist/appointments", { method: "POST", body }),
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
};