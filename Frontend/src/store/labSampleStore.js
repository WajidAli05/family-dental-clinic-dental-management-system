import { create } from "zustand";
import { receptionistApi } from "@/lib/receptionistApi";
// keep dentistApi if other parts still reference it
import { dentistApi } from "@/lib/dentistApi";

const toUiSampleStatus = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "sent" || v === "received") return "Sent";
  if (v === "in-process" || v === "in_progress") return "In Process";
  if (v === "ready") return "Ready";
  if (v === "delivered") return "Delivered";
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  return s || "Sent";
};

const mapRow = (x) => ({
  id: x.id,
  patientName: x.patientName,
  dentist: x.dentistName || x.dentist,
  lab: x.labName || x.lab,
  teeth: Array.isArray(x.teeth)
    ? x.teeth
    : String(x.tooth || "")
        .replaceAll("#", "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
  sentDate: x.date,
  receivedDate: x.receivedDate || null,
  status: toUiSampleStatus(x.status),
  paymentStatus: x.paymentStatus || "Pending",
  comments: x.note || x.comments || "",
});

export const useLabSampleStore = create((set, get) => ({
  loading: false,
  error: null,
  samples: [],

  // ✅ fetch for receptionist (DB)
  fetchSamples: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      // Prefer receptionist endpoint
      const res = await receptionistApi.getLabSamples(params);

      set({
        samples: (res.data || []).map(mapRow),
        loading: false,
      });
    } catch (e) {
      // fallback (if you still want dentist behavior somewhere)
      try {
        const res2 = await dentistApi.getLabSamples(params);
        set({
          samples: (res2.data || []).map(mapRow),
          loading: false,
        });
      } catch (e2) {
        set({ error: e.message || e2.message, loading: false });
      }
    }
  },

  // ✅ create (used by AddLabSampleModal)
  addSample: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistApi.createLabSample(payload);
      set((state) => ({
        samples: [mapRow(res.data), ...state.samples],
        loading: false,
      }));
      return res.data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ✅ edit (used by EditLabSampleModal)
  editSample: async (id, payload) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistApi.updateLabSample(id, payload);
      set((state) => ({
        samples: state.samples.map((s) => (s.id === id ? mapRow(res.data) : s)),
        loading: false,
      }));
      return res.data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ✅ page calls updateStatus(id, status)
  updateStatus: async (id, status) => {
    // optimistic
    set((state) => ({
      samples: state.samples.map((s) => (s.id === id ? { ...s, status } : s)),
    }));

    try {
      const res = await receptionistApi.updateLabSampleStatus(id, { status });
      set((state) => ({
        samples: state.samples.map((s) => (s.id === id ? mapRow(res.data) : s)),
      }));
      return res.data;
    } catch (e) {
      set({ error: e.message });
      // safe recovery
      await get().fetchSamples().catch(() => {});
      throw e;
    }
  },

  // ✅ page calls markDelivered(id)
  markDelivered: async (id) => {
    // optimistic
    set((state) => ({
      samples: state.samples.map((s) => (s.id === id ? { ...s, status: "Delivered" } : s)),
    }));

    try {
      const res = await receptionistApi.deliverLabSample(id);
      set((state) => ({
        samples: state.samples.map((s) => (s.id === id ? mapRow(res.data) : s)),
      }));
      return res.data;
    } catch (e) {
      set({ error: e.message });
      await get().fetchSamples().catch(() => {});
      throw e;
    }
  },

  // ✅ page calls deleteSample(id)
  deleteSample: async (id) => {
    try {
      set({ error: null });
      await receptionistApi.deleteLabSample(id);
      set((state) => ({
        samples: state.samples.filter((s) => s.id !== id),
      }));
      return true;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  // ✅ keep your existing updateSample (don’t remove)
  updateSample: async (id, updates) => {
    // Dentist approves path (keep)
    if (String(updates?.status || "").toLowerCase() === "approved") {
      try {
        set({ error: null });
        await dentistApi.approveLabSample(id);
        await get().fetchSamples();
      } catch (e) {
        set({ error: e.message });
      }
      return;
    }

    // fallback local update
    set((state) => ({
      samples: state.samples.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  },

  getStats: () => {
    const samples = get().samples;
    return {
      total: samples.length,
      sent: samples.filter((s) => s.status === "Sent").length,
      inProcess: samples.filter((s) => s.status === "In Process").length,
      ready: samples.filter((s) => s.status === "Ready").length,
    };
  },
}));