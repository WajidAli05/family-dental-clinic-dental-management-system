import { create } from "zustand";

const API = `${import.meta.env.VITE_API_BASE_URL}/lab`;

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
  pagination: { total: 0, page: 1, pages: 1 },

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
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all"))
      ).toString();
      const res = await authFetch(`${API}/cases${qs ? `?${qs}` : ""}`);
      const json = await res.json();

      const normalized = (json.data || []).map((x) => ({
        ...x,
        status: mapBackendStatusToUi(x.status),
      }));

      set({
        samples: normalized,
        pagination: { total: json.total ?? 0, page: json.page ?? 1, pages: json.pages ?? 1 },
        loadingSamples: false,
      });
    } catch (e) {
      set({ error: e.message, loadingSamples: false });
    }
  },

  // Unified status update — sends canonical DB status string
  updateStatus: async (sampleId, dbStatus) => {
    const { samples } = get();
    const idx = samples.findIndex((s) => s.id === sampleId);
    if (idx === -1) return;

    const oldStatus = samples[idx].status;
    const newUiStatus = mapBackendStatusToUi(dbStatus);

    // Optimistic update
    const optimistic = [...samples];
    optimistic[idx] = { ...optimistic[idx], status: newUiStatus };
    set({ samples: optimistic, error: null });

    try {
      const res = await authFetch(`${API}/cases/${sampleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: dbStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || `Failed: ${res.status}`);
      }
      await get().fetchStats();
    } catch (e) {
      // Rollback
      const rolled = [...get().samples];
      rolled[idx] = { ...rolled[idx], status: oldStatus };
      set({ samples: rolled, error: e.message });
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
        samples: state.samples.map((s) => s.id === sampleId ? { ...s, note } : s),
      }));
      await get().fetchStats();
    } catch (e) {
      set({ error: e.message });
    }
  },

  startWork: async (sampleId) => get().updateStatus(sampleId, "in_progress"),
  markReady: async (sampleId) => get().updateStatus(sampleId, "ready"),
  markDelivered: async (sampleId) => get().updateStatus(sampleId, "delivered"),
}));
