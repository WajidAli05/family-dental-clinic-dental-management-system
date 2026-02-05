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

  // Normalize errors
  if (!res.ok || json?.success === false) {
    const msg = json?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return json; // { success, data }
}

export const receptionistApi = {
  // GETs
  getStats: (params) => request("/receptionist/stats", { params }),
  getAppointments: (params) => request("/receptionist/appointments", { params }),
  getLabSamples: (params) => request("/receptionist/lab-samples", { params }),

  // POSTs
  createPatient: (body) =>
    request("/receptionist/patients", { method: "POST", body }),
  createAppointment: (body) =>
    request("/receptionist/appointments", { method: "POST", body }),

  // add these into receptionistApi:
    getPatients: (params) => request("/receptionist/patients", { params }),
    getPatientStats: () => request("/receptionist/patients/stats"),
    createPatient: (body) => request("/receptionist/patients", { method: "POST", body }),
};