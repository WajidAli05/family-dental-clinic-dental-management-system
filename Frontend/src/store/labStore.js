import { create } from "zustand";

const API = "http://localhost:3000/api/v1/lab";

const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
};

const mapBackendStatusToUi = (s) => {
  const v = String(s || "").toLowerCase();

  if (v === "received" || v === "sent") return "sent";
  if (v === "in_progress" || v === "in-process") return "in-process";
  if (v === "ready") return "ready";
  if (v === "delivered") return "delivered";
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";

  return v || "sent";
};

export const useLabStore = create((set, get) => ({
  loadingStats: false,
  loadingSamples: false,
  error: null,

  stats: { total: 0, inProcess: 0, ready: 0, recent: 0 },
  samples: [],

  fetchStats: async () => {
    try {
      set({ loadingStats: true, error: null });
      const res = await authFetch(`${API}/stats`);
      const json = await res.json();
      set({ stats: json.data, loadingStats: false });
    } catch (e) {
      set({ error: e.message, loadingStats: false });
    }
  },

  fetchSamples: async (params = {}) => {
    try {
      set({ loadingSamples: true, error: null });

      const qs = new URLSearchParams(params).toString();
      const res = await authFetch(`${API}/cases?${qs}`);
      const json = await res.json();

      const normalized = (json.data || []).map((x) => ({
        ...x,
        status: mapBackendStatusToUi(x.status),
      }));

      set({ samples: normalized, loadingSamples: false });
    } catch (e) {
      set({ error: e.message, loadingSamples: false });
    }
  },

  addNote: async (sampleId, note) => {
    try {
      set({ error: null });

      await authFetch(`${API}/cases/${sampleId}/note`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      });

      set((state) => ({
        samples: state.samples.map((s) =>
          s.id === sampleId ? { ...s, note } : s
        ),
      }));

      await get().fetchStats();
      await get().fetchSamples();
    } catch (e) {
      set({ error: e.message });
    }
  },

  startWork: async (sampleId) => {
    try {
      set({ error: null });
      await authFetch(`${API}/cases/${sampleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      });
      await get().fetchStats();
      await get().fetchSamples();
    } catch (e) {
      set({ error: e.message });
    }
  },

  markReady: async (sampleId) => {
    try {
      set({ error: null });
      await authFetch(`${API}/cases/${sampleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ready" }),
      });
      await get().fetchStats();
      await get().fetchSamples();
    } catch (e) {
      set({ error: e.message });
    }
  },

  markDelivered: async (sampleId) => {
    try {
      set({ error: null });
      await authFetch(`${API}/cases/${sampleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "delivered" }),
      });
      await get().fetchStats();
      await get().fetchSamples();
    } catch (e) {
      set({ error: e.message });
    }
  },
}));