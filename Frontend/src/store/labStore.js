import { create } from "zustand";
import { labApi } from "@/lib/labApi";

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

  // ---------- FETCH STATS ----------
  fetchStats: async () => {
    try {
      set({ loadingStats: true, error: null });
      const res = await labApi.getStats();
      set({ stats: res.data, loadingStats: false });
    } catch (e) {
      set({ error: e.message, loadingStats: false });
    }
  },

  // ---------- FETCH SAMPLES ----------
  fetchSamples: async (params = {}) => {
    try {
      set({ loadingSamples: true, error: null });
      const res = await labApi.getCases(params);

      const normalized = (res.data || []).map((x) => ({
        ...x,
        status: mapBackendStatusToUi(x.status),
      }));

      set({ samples: normalized, loadingSamples: false });
    } catch (e) {
      set({ error: e.message, loadingSamples: false });
    }
  },

  // ---------- NOTE ----------
  addNote: async (sampleId, note) => {
    try {
      set({ error: null });

      // backend patch: /lab/cases/:id/note  body: { note }
      await labApi.updateCaseNote(sampleId, { note });

      // Optimistic local update (fast UI) + then re-fetch for truth
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

  // ---------- STATUS ACTIONS ----------
  startWork: async (sampleId) => {
    try {
      set({ error: null });
      await labApi.updateCaseStatus(sampleId, { status: "in-process" });
      await get().fetchStats();
      await get().fetchSamples();
    } catch (e) {
      set({ error: e.message });
    }
  },

  markReady: async (sampleId) => {
    try {
      set({ error: null });
      await labApi.updateCaseStatus(sampleId, { status: "ready" });
      await get().fetchStats();
      await get().fetchSamples();
    } catch (e) {
      set({ error: e.message });
    }
  },

  markDelivered: async (sampleId) => {
    try {
      set({ error: null });
      await labApi.updateCaseStatus(sampleId, { status: "delivered" });
      await get().fetchStats();
      await get().fetchSamples();
    } catch (e) {
      set({ error: e.message });
    }
  },
}));