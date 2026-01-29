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

  changePassword: ({ currentPassword, newPassword }) =>
    req("/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getStats: () => req("/stats"),

  // ✅ appointments (date optional)
  getAppointments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/appointments${qs ? `?${qs}` : ""}`);
  },

  // ✅ THIS fixes your error
  getCases: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/cases${qs ? `?${qs}` : ""}`);
  },

  approveCase: (caseId) =>
    req(`/cases/${caseId}/approve`, { method: "PATCH" }),
};