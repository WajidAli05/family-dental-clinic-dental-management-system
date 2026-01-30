import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";
import { printPrescription } from "@/utils/printPrescription";

const todayISO = () => new Date().toISOString().slice(0, 10);

const initialState = () => ({
  // backend id (for edit mode)
  _id: null,

  // linkage (so we can load/print per patient/date)
  patientId: "",
  date: "",

  // form fields
  patientType: null, // "normal" | "ortho"
  selectedTeeth: [],
  diagnosis: "",
  treatment: "",
  clinicalFinding: "",
  visualStatus: "none",
  notes: "",

  // ui flags
  saving: false,
  error: null,
});

export const usePrescriptionStore = create((set, get) => ({
  ...initialState(),

  // -----------------------
  // setters
  // -----------------------
  setId: (_id) => set({ _id }),
  setPatientId: (patientId) => set({ patientId }),
  setDate: (date) => set({ date }),

  setPatientType: (patientType) => set({ patientType }),
  setDiagnosis: (diagnosis) => set({ diagnosis }),
  setTreatment: (treatment) => set({ treatment }),
  setClinicalFinding: (clinicalFinding) => set({ clinicalFinding }),
  setVisualStatus: (visualStatus) => set({ visualStatus }),
  setNotes: (notes) => set({ notes }),

  setSaving: (saving) => set({ saving }),
  setError: (error) => set({ error }),

  toggleTooth: (tooth) =>
    set((state) => {
      const exists = state.selectedTeeth.includes(tooth);
      return {
        selectedTeeth: exists
          ? state.selectedTeeth.filter((t) => t !== tooth)
          : [...state.selectedTeeth, tooth],
      };
    }),

  // -----------------------
  // helpers
  // -----------------------
  reset: () => set(initialState()),

  // Build payload in one place so modal + table stay consistent
  toPayload: () => {
    const s = get();
    return {
      patientType: s.patientType,
      selectedTeeth: s.selectedTeeth,
      diagnosis: s.diagnosis,
      treatment: s.treatment,
      clinicalFinding: s.clinicalFinding,
      visualStatus: s.visualStatus,
      notes: s.notes,
      patientId: s.patientId,
      date: s.date || todayISO(),
    };
  },

  // -----------------------
  // backend: create/update
  // -----------------------
  saveOrUpdate: async (overrides = {}) => {
    try {
      set({ saving: true, error: null });

      const s = get();
      const payload = {
        ...get().toPayload(),
        ...overrides,
      };

      // safety defaults
      payload.patientId = payload.patientId || s.patientId || "";
      payload.date = payload.date || s.date || todayISO();

      if (!payload.patientId) {
        throw new Error("Missing patientId");
      }
      if (!payload.patientType) {
        throw new Error("Please select patient type");
      }
      if (!Array.isArray(payload.selectedTeeth)) {
        throw new Error("selectedTeeth must be an array");
      }

      // ✅ update if we already have _id
      if (s._id) {
        const res = await dentistApi.updatePrescription(s._id, payload);
        const updated = res?.data || res; // depending on your api wrapper
        set({ saving: false });
        // keep store synced
        if (updated) get().hydrateFromBackend(updated);
        return updated;
      }

      // ✅ else create
      const res = await dentistApi.createPrescription(payload);
      const created = res?.data || res;
      set({ saving: false });

      // hydrate store so next time it becomes "Edit"
      if (created) get().hydrateFromBackend(created);

      return created;
    } catch (e) {
      set({ saving: false, error: e.message || "Failed to save prescription" });
      throw e;
    }
  },

  // -----------------------
  // hydrate from backend (prefill)
  // -----------------------
  hydrateFromBackend: (rx) =>
    set(() => ({
      _id: rx?.id || rx?._id || null,

      patientType: rx?.patientType || null,
      selectedTeeth: Array.isArray(rx?.selectedTeeth) ? rx.selectedTeeth : [],

      diagnosis: rx?.diagnosis || "",
      treatment: rx?.treatment || "",
      clinicalFinding: rx?.clinicalFinding || "",
      visualStatus: rx?.visualStatus || "none",
      notes: rx?.notes || "",

      patientId: rx?.patientId || "",
      date: rx?.date || "",

      error: null,
    })),

  // -----------------------
  // print current store state
  // -----------------------
  print: () => {
    const state = get();
    printPrescription(state);
  },
}));