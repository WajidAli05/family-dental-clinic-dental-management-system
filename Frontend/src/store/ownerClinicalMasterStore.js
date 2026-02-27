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
  treatments: [],
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
      const res = await ownerApi.getClinicalMaster();
      const data = res?.data || {};

      set({
        treatments: Array.isArray(data.treatments) ? data.treatments : [],
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