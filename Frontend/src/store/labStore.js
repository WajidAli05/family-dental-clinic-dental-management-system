import { create } from "zustand";
import { handleUnauthorized } from "@/lib/httpClient";

const API = `${import.meta.env.VITE_API_BASE_URL}/lab`;

const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) handleUnauthorized("/lab");
  return res;
};

export const useLabStore = create((set, get) => ({
  loadingStats: false,
  loadingSamples: false,
  error: null,

  stats: { total: 0, inProcess: 0, ready: 0, recent: 0 },
  samples: [],
  pagination: { total: 0, page: 1, pages: 1 },
  // Remembered so a post-update refetch keeps the active filter and page
  // instead of silently resetting the view to page 1 / all.
  lastParams: {},

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
      set({ loadingSamples: true, error: null, lastParams: params });
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all"))
      ).toString();
      const res = await authFetch(`${API}/cases${qs ? `?${qs}` : ""}`);
      const json = await res.json();

      // Status arrives CANONICAL from the shared mapper; rewriting it here is
      // what made the select fall out of sync with its own options.
      set({
        samples: json.data || [],
        pagination: { total: json.total ?? 0, page: json.page ?? 1, pages: json.pages ?? 1 },
        loadingSamples: false,
      });
    } catch (e) {
      set({ error: e.message, loadingSamples: false });
    }
  },

  /** Re-runs the last fetchSamples call with the same params. */
  refetchSamples: async () => get().fetchSamples(get().lastParams || {}),

  /**
   * Status update.
   *
   * Applies the SERVER's response rather than a locally-guessed value, then
   * refetches. The old version optimistically wrote a UI-only status string
   * that matched none of the dropdown's options, so React fell back to
   * rendering the first option ("Sent") even though the change had succeeded.
   *
   * Rethrows so the caller can toast the failure.
   */
  updateStatus: async (sampleId, dbStatus) => {
    const res = await authFetch(`${API}/cases/${sampleId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: dbStatus }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Failed: ${res.status}`);

    // Apply what the server actually saved, including the fresh allowedNext.
    const updated = json?.data;
    if (updated?.id) {
      set((state) => ({
        samples: state.samples.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
      }));
    }
    // Refetch so allowedNext and the stats tiles stay truthful.
    await Promise.all([get().fetchStats(), get().refetchSamples()]);
    return updated;
  },

  addNote: async (sampleId, note) => {
    const res = await authFetch(`${API}/cases/${sampleId}/note`, {
      method: "PATCH",
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.message || `Failed: ${res.status}`);
    }
    set((state) => ({
      samples: state.samples.map((s) => (s.id === sampleId ? { ...s, note } : s)),
    }));
    await get().fetchStats();
  },

  // Canonical statuses — the legacy spellings are still accepted by the API,
  // but nothing new should be written in them.
  startWork: async (sampleId) => get().updateStatus(sampleId, "in_production"),
  markReady: async (sampleId) => get().updateStatus(sampleId, "ready"),
  markDelivered: async (sampleId) => get().updateStatus(sampleId, "dispatched"),
}));
