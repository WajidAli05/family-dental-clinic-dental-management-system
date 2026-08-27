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

  // Per-tooth clinical record — the tooth-based model. Each entry:
  // { toothNumber, diagnosis, treatment, clinicalFinding, note,
  //   xrayRequested, xrayNote }. Legacy prescriptions load with [] and keep
  // using the flat diagnosis/treatment/clinicalFinding fields below.
  toothEntries: [],
  appointmentId: "",

  // ── Treatment-plan link (UI-only) ──
  // Which tooth entries came from a plan item, and which the dentist ticked
  // to complete on save. Deliberately NOT part of toPayload(): the
  // Prescription document is unchanged by this feature.
  //   planLinks: { [toothNumber]: { planId, itemId, itemName, forThisVisit } }
  //   planCompletions: { ["TP-0001|TPI-2"]: true }
  planLinks: {},
  planCompletions: {},

  // Legacy single-block clinical fields — still loaded/saved so old
  // prescriptions round-trip unchanged.
  diagnosis: "",
  treatment: "",
  clinicalFinding: "",
  visualStatus: "none",
  notes: "",

  // medication rows (UI shape: {medicationId, name, form, strength, m, n, e, durationDays, withFood, instructions})
  medications: [],

  // ui flags
  saving: false,
  error: null,
});

// Derive frequencyLabel from m/n/e counts and form
function frequencyLabel(m, n, e, form = "tablet") {
  const parts = [];
  if (m) parts.push(`${m} morning`);
  if (n) parts.push(`${n} noon`);
  if (e) parts.push(`${e} evening`);
  if (!parts.length) return "";
  return `${parts.join(", ")} (${form})`;
}

export const usePrescriptionStore = create((set, get) => ({
  ...initialState(),

  // -----------------------
  // setters
  // -----------------------
  setId: (_id) => set({ _id }),
  setPatientId: (patientId) => set({ patientId }),
  setAppointmentId: (appointmentId) => set({ appointmentId }),
  setDate: (date) => set({ date }),

  // Create-or-replace this tooth's clinical entry. An entry with no clinical
  // content at all is removed instead of stored, so "included teeth" always
  // means "teeth with a real clinical record".
  upsertToothEntry: (toothNumber, patch) =>
    set((s) => {
      // Legacy prescriptions hydrated from older docs may carry no
      // toothEntries at all — never assume the array exists.
      const current = Array.isArray(s.toothEntries) ? s.toothEntries : [];
      const rest = current.filter((e) => e.toothNumber !== toothNumber);
      const merged = {
        toothNumber,
        diagnosis: "", treatment: "", clinicalFinding: "", note: "",
        xrayRequested: false, xrayNote: "",
        ...(current.find((e) => e.toothNumber === toothNumber) || {}),
        ...patch,
      };
      const isEmpty =
        !merged.diagnosis && !merged.treatment && !merged.clinicalFinding &&
        !merged.note && !merged.xrayRequested && !merged.xrayNote;
      const next = isEmpty ? rest : [...rest, merged];
      return { toothEntries: next, selectedTeeth: next.map((e) => e.toothNumber) };
    }),

  removeToothEntry: (toothNumber) =>
    set((s) => {
      const current = Array.isArray(s.toothEntries) ? s.toothEntries : [];
      const next = current.filter((e) => e.toothNumber !== toothNumber);
      return { toothEntries: next, selectedTeeth: next.map((e) => e.toothNumber) };
    }),

  /**
   * Prefills tooth entries from accepted plan items. Only ever called on a
   * blank prescription, and it never overwrites a tooth the dentist has
   * already written into — existing content wins.
   */
  prefillFromPlan: (rows = []) =>
    set((s) => {
      const current = Array.isArray(s.toothEntries) ? s.toothEntries : [];
      const byTooth = new Map(current.map((e) => [e.toothNumber, e]));
      const links = { ...s.planLinks };

      for (const row of rows) {
        for (const tooth of row.toothNumbers || []) {
          const existing = byTooth.get(tooth);
          if (existing && existing.treatment) continue; // dentist's text wins
          byTooth.set(tooth, {
            toothNumber: tooth,
            diagnosis: "", clinicalFinding: "", note: "",
            xrayRequested: false, xrayNote: "",
            ...(existing || {}),
            // Only the TREATMENT is prefilled — diagnosis/finding/notes stay
            // empty for the dentist to fill in.
            treatment: row.name,
          });
          links[tooth] = {
            planId: row.planId, itemId: row.itemId,
            itemName: row.name, forThisVisit: !!row.forThisVisit,
          };
        }
      }
      const next = [...byTooth.values()];
      return { toothEntries: next, selectedTeeth: next.map((e) => e.toothNumber), planLinks: links };
    }),

  togglePlanCompletion: (planId, itemId) =>
    set((s) => {
      const key = `${planId}|${itemId}`;
      const next = { ...s.planCompletions };
      if (next[key]) delete next[key];
      else next[key] = true;
      return { planCompletions: next };
    }),

  /** [{planId,itemId}] the dentist ticked to mark completed on save. */
  pendingPlanCompletions: () =>
    Object.keys(get().planCompletions || {}).map((k) => {
      const [planId, itemId] = k.split("|");
      return { planId, itemId };
    }),

  setPatientType: (patientType) => set({ patientType }),
  setDiagnosis: (diagnosis) => set({ diagnosis }),
  setTreatment: (treatment) => set({ treatment }),
  setClinicalFinding: (clinicalFinding) => set({ clinicalFinding }),
  setVisualStatus: (visualStatus) => set({ visualStatus }),
  setNotes: (notes) => set({ notes }),

  setSaving: (saving) => set({ saving }),
  setError: (error) => set({ error }),

  // medication list mutations
  addMedication: (med) => set((s) => ({ medications: [...s.medications, med] })),
  updateMedication: (idx, patch) =>
    set((s) => ({
      medications: s.medications.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    })),
  removeMedication: (idx) =>
    set((s) => ({ medications: s.medications.filter((_, i) => i !== idx) })),

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
    const medications = (s.medications || []).map((med) => ({
      medicationId:   med.medicationId || "",
      name:           med.name || "",
      form:           med.form || "tablet",
      strength:       med.strength || "",
      dose:           `${med.m || 0}+${med.n || 0}+${med.e || 0}`,
      frequencyLabel: frequencyLabel(med.m || 0, med.n || 0, med.e || 0, med.form || "tablet"),
      durationDays:   med.durationDays || 0,
      withFood:       med.withFood || "any",
      instructions:   med.instructions || "",
    }));
    return {
      patientType: s.patientType,
      selectedTeeth: s.selectedTeeth,
      // Plan link state is UI-only — never written to the Prescription.
      toothEntries: (s.toothEntries || []).map(
        ({ planId, itemId, fromPlan, ...entry }) => entry
      ),
      diagnosis: s.diagnosis,
      treatment: s.treatment,
      clinicalFinding: s.clinicalFinding,
      visualStatus: s.visualStatus,
      notes: s.notes,
      medications,
      patientId: s.patientId,
      appointmentId: s.appointmentId,
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
      toothEntries: Array.isArray(rx?.toothEntries) ? rx.toothEntries : [],
      appointmentId: rx?.appointmentId || "",

      diagnosis: rx?.diagnosis || "",
      treatment: rx?.treatment || "",
      clinicalFinding: rx?.clinicalFinding || "",
      visualStatus: rx?.visualStatus || "none",
      notes: rx?.notes || "",

      medications: Array.isArray(rx?.medications) ? rx.medications.map((med) => {
        const parts = String(med.dose || "0+0+0").split("+");
        return {
          medicationId: med.medicationId || "",
          name:         med.name || "",
          form:         med.form || "tablet",
          strength:     med.strength || "",
          m:            parseInt(parts[0]) || 0,
          n:            parseInt(parts[1]) || 0,
          e:            parseInt(parts[2]) || 0,
          durationDays: med.durationDays || 0,
          withFood:     med.withFood || "any",
          instructions: med.instructions || "",
        };
      }) : [],

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