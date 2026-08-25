// src/store/ownerClinicalMasterStore.js
import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const defaultFilters = {
  query: "",
  status: "all", // all | active | inactive
};

export const useOwnerClinicalMasterStore = create((set, get) => ({
  initialized: false,
  loading: false,
  error: "",

  // ---------- MASTER DATA ----------
  // ONE treatment list, re-priced for whichever schedule is active — the list
  // is never duplicated per schedule.
  treatments: [],
  feeSchedules: [],
  activeScheduleId: "",
  defaultScheduleId: "",
  diagnosisTemplates: [], // ✅ keep key for compatibility; UI label will be "Clinical Diagnosis"
  clinicalFindingTemplates: [],

  // ---------- UI STATE ----------
  activeCategory: "treatments", // treatments | diagnosis | findings
  filters: { ...defaultFilters },

  modal: {
    open: false,
    mode: "create", // create | edit
    category: "treatments",
    payload: null,
  },

  confirm: {
    open: false,
    title: "",
    message: "",
    onConfirmKey: null,
    onConfirmPayload: null,
  },

  // ---------- init ----------
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    await get().refreshAll();
  },

  refreshAll: async () => {
    set({ loading: true, error: "" });
    try {
      // Prices come back already resolved for this schedule (getTreatmentFee
      // on the server) — the UI never does price math or fallback itself.
      const res = await ownerApi.getClinicalMaster({ scheduleId: get().activeScheduleId || undefined });
      const data = res?.data || {};

      set({
        treatments: Array.isArray(data.treatments) ? data.treatments : [],
        feeSchedules: Array.isArray(data.feeSchedules) ? data.feeSchedules : [],
        activeScheduleId: data.activeScheduleId || "",
        defaultScheduleId: data.defaultScheduleId || "",
        diagnosisTemplates: Array.isArray(data.diagnosisTemplates) ? data.diagnosisTemplates : [],
        clinicalFindingTemplates: Array.isArray(data.clinicalFindingTemplates) ? data.clinicalFindingTemplates : [],
      });
    } catch (e) {
      console.error("Clinical master refreshAll failed:", e);
      set({
        treatments: [],
        diagnosisTemplates: [],
        clinicalFindingTemplates: [],
        error: e?.message || "Failed to load Clinical Master",
      });
    } finally {
      set({ loading: false });
    }
  },

  // ---------- FEE SCHEDULES ----------
  setActiveSchedule: async (scheduleId) => {
    set({ activeScheduleId: scheduleId });
    await get().refreshAll();
  },

  createFeeSchedule: async (name) => {
    const res = await ownerApi.createFeeSchedule(name);
    set({ activeScheduleId: res?.data?.id || get().activeScheduleId });
    await get().refreshAll();
  },

  renameFeeSchedule: async (id, name) => {
    await ownerApi.renameFeeSchedule(id, name);
    await get().refreshAll();
  },

  setDefaultFeeSchedule: async (id) => {
    await ownerApi.setDefaultFeeSchedule(id);
    await get().refreshAll();
  },

  deleteFeeSchedule: async (id) => {
    await ownerApi.deleteFeeSchedule(id);
    // Fall back to the default so the view never points at a dead schedule.
    if (get().activeScheduleId === id) set({ activeScheduleId: get().defaultScheduleId });
    await get().refreshAll();
  },

  // Sets THIS schedule's price for one treatment. When the active schedule is
  // the default, the server mirrors it into the legacy `fee` too.
  setTreatmentPrice: async (treatmentId, fee) => {
    await ownerApi.setTreatmentPrice(treatmentId, get().activeScheduleId, fee);
    await get().refreshAll();
  },

  // Drops the override so the row inherits from the default again.
  clearTreatmentPrice: async (treatmentId) => {
    await ownerApi.clearTreatmentPrice(treatmentId, get().activeScheduleId);
    await get().refreshAll();
  },

  // ---------- CATEGORY ----------
  setActiveCategory: (category) =>
    set(() => ({
      activeCategory: category,
      filters: { ...get().filters, status: "all" },
    })),

  // ---------- Filters ----------
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  // ---------- MODAL ----------
  openCreate: (category) => set({ modal: { open: true, mode: "create", category, payload: null } }),
  openEdit: (category, payload) => set({ modal: { open: true, mode: "edit", category, payload } }),
  closeModal: () => set({ modal: { open: false, mode: "create", category: "treatments", payload: null } }),

  // ---------- CONFIRM ----------
  openConfirm: ({ title, message, onConfirmKey, onConfirmPayload }) =>
    set({ confirm: { open: true, title, message, onConfirmKey, onConfirmPayload } }),

  closeConfirm: () =>
    set({ confirm: { open: false, title: "", message: "", onConfirmKey: null, onConfirmPayload: null } }),

  runConfirm: async () => {
    const { confirm } = get();
    if (!confirm.onConfirmKey) return;

    const actionMap = {
      deleteTreatment: async (id) => get().deleteTreatment(id),
      deleteFeeSchedule: async (id) => get().deleteFeeSchedule(id),
      deleteDiagnosis: async (id) => get().deleteDiagnosis(id),
      deleteFinding: async (id) => get().deleteFinding(id),
    };

    const fn = actionMap[confirm.onConfirmKey];
    try {
      if (fn) await fn(confirm.onConfirmPayload);
    } finally {
      get().closeConfirm();
    }
  },

  // ==========================
  // ✅ CRUD: TREATMENTS
  // ==========================
  addTreatment: async (form) => {
    const payload = {
      name: form.name,
      code: form.code || "",
      fee: Number(form.fee || 0),
      active: form.active !== undefined ? !!form.active : true,
      notes: form.notes || "",
    };
    await ownerApi.createClinicalTreatment(payload);
    await get().refreshAll();
  },

  updateTreatment: async (id, patch) => {
    const payload = { ...patch };
    await ownerApi.updateClinicalTreatment(id, payload);
    await get().refreshAll();
  },

  toggleTreatmentActive: async (id) => {
    await ownerApi.toggleClinicalTreatment(id);
    await get().refreshAll();
  },

  deleteTreatment: async (id) => {
    await ownerApi.deleteClinicalTreatment(id);
    await get().refreshAll();
  },

  // ==========================
  // ✅ CRUD: CLINICAL DIAGNOSIS
  // ==========================
  addDiagnosis: async (form) => {
    const payload = {
      title: form.title,
      description: form.description || "",
      active: form.active !== undefined ? !!form.active : true,
    };
    await ownerApi.createClinicalDiagnosis(payload);
    await get().refreshAll();
  },

  updateDiagnosis: async (id, patch) => {
    const payload = { ...patch };
    await ownerApi.updateClinicalDiagnosis(id, payload);
    await get().refreshAll();
  },

  deleteDiagnosis: async (id) => {
    await ownerApi.deleteClinicalDiagnosis(id);
    await get().refreshAll();
  },

  // ==========================
  // ✅ CRUD: CLINICAL FINDINGS
  // ==========================
  addFinding: async (form) => {
    const payload = {
      title: form.title,
      description: form.description || "",
      active: form.active !== undefined ? !!form.active : true,
    };
    await ownerApi.createClinicalFinding(payload);
    await get().refreshAll();
  },

  updateFinding: async (id, patch) => {
    const payload = { ...patch };
    await ownerApi.updateClinicalFinding(id, payload);
    await get().refreshAll();
  },

  deleteFinding: async (id) => {
    await ownerApi.deleteClinicalFinding(id);
    await get().refreshAll();
  },
}));