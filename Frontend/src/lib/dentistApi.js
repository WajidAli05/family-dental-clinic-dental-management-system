const BASE = "http://localhost:3000/api/v1/dentist";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Request failed");
  return json;
}

export const dentistApi = {
  getMe: () => req("/me"),

  updateMe: (payload) =>
    req("/me", { method: "PATCH", body: JSON.stringify(payload) }),

  // NOTE: your backend controller uses POST /dentist/change-password (recommended)
  // If your backend is still /me/password, keep it. Otherwise update to "/change-password".
  changePassword: ({ currentPassword, newPassword }) =>
    req("/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getStats: () => req("/stats"),

  // ✅ appointments (date optional)
  getAppointments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/appointments${qs ? `?${qs}` : ""}`);
  },

  // ✅ lab cases (status/q optional)
  getCases: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/cases${qs ? `?${qs}` : ""}`);
  },

  approveCase: (caseId) =>
    req(`/cases/${caseId}/approve`, { method: "PATCH" }),

  // ✅ prescriptions
  createPrescription: (payload) =>
    req("/prescriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getPrescriptions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/prescriptions${qs ? `?${qs}` : ""}`);
  },

  getPrescriptionById: (id) => req(`/prescriptions/${id}`),

updatePrescription: (id, payload) =>
  req(`/prescriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
};