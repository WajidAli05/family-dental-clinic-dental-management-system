import { create } from "zustand";
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

export const useLabSampleStore = create((set, get) => ({
  loading: false,
  error: null,
  samples: [],

  fetchSamples: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      const res = await dentistApi.getLabSamples(params);

      set({
        samples: (res.data || []).map((x) => ({
          id: x.id,
          patientName: x.patientName,
          dentist: x.dentistName,
          lab: x.labName,
          teeth: String(x.tooth || "").replaceAll("#", "").split(",").map((t) => t.trim()).filter(Boolean),
          sentDate: x.date,      // UI field
          receivedDate: null,
          status: toUiSampleStatus(x.status),
          paymentStatus: "Pending",
          comments: x.note || "",
        })),
        loading: false,
      });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  updateSample: async (id, updates) => {
    // Dentist approves
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

    // fallback local update if UI uses it
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