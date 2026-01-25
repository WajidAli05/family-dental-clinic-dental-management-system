import { api } from "./api";

export const labApi = {
  // Profile
  getMe: () => api.get("/lab/me"),
  updateMe: (patch) => api.patch("/lab/me", patch),

  // Dashboard
  getStats: () => api.get("/lab/stats"),
  getCases: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") qs.set(k, v);
    });

    const query = qs.toString() ? `?${qs.toString()}` : "";
    return api.get(`/lab/cases${query}`);
  },

  updateCaseStatus: (id, payload) => api.patch(`/lab/cases/${id}/status`, payload),
  updateCaseNote: (id, payload) => api.patch(`/lab/cases/${id}/note`, payload),
};