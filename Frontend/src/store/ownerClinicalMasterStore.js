import { create } from "zustand";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultFilters = {
  query: "",
  status: "all", // all | active | inactive | enabled | disabled (category-based)
};

export const useOwnerClinicalMasterStore = create((set, get) => ({
  initialized: false,

  // ---------- MASTER DATA ----------
  treatments: [],
  diagnosisTemplates: [],
  clinicalFindingTemplates: [],
  documentationTemplates: [],

  // ---------- UI STATE ----------
  activeCategory: "treatments", // treatments | diagnosis | findings | docs

  // ✅ Search & Filters
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

  // ---------- DEMO SEED ----------
  seed: () => ({
    treatments: [
      {
        id: "TRM-1",
        name: "Scaling & Polishing",
        code: "SP",
        fee: 3500,
        active: true,
        notes: "Full mouth scaling",
      },
      {
        id: "TRM-2",
        name: "Root Canal Treatment",
        code: "RCT",
        fee: 18000,
        active: true,
        notes: "Per canal (adjust as needed)",
      },
      { id: "TRM-3", name: "Composite Filling", code: "FILL", fee: 5000, active: true, notes: "" },
      { id: "TRM-4", name: "Extraction", code: "EXT", fee: 4500, active: false, notes: "Inactive example" },
    ],
    diagnosisTemplates: [
      { id: "DX-1", title: "Dental Caries", description: "Caries noted in molar region", active: true },
      { id: "DX-2", title: "Gingivitis", description: "Generalized gingival inflammation", active: true },
      { id: "DX-3", title: "Pulpitis", description: "Irreversible pulpitis symptoms", active: true },
    ],
    clinicalFindingTemplates: [
      { id: "CF-1", title: "Bleeding on Probing", description: "BOP present in posterior sextants", active: true },
      { id: "CF-2", title: "Calculus", description: "Moderate calculus deposits", active: true },
    ],
    documentationTemplates: [
      {
        id: "DOC-1",
        name: "Initial Consultation",
        enabled: true,
        sections: [
          {
            id: "SEC-1",
            title: "Vitals",
            fields: [
              { id: "F-1", label: "BP", type: "text", required: false },
              { id: "F-2", label: "Pulse", type: "number", required: false },
            ],
          },
          {
            id: "SEC-2",
            title: "Chief Complaint",
            fields: [{ id: "F-3", label: "Complaint", type: "textarea", required: true }],
          },
        ],
      },
      {
        id: "DOC-2",
        name: "RCT Follow-up",
        enabled: false,
        sections: [
          {
            id: "SEC-3",
            title: "Pain Assessment",
            fields: [
              { id: "F-4", label: "Pain Score (0-10)", type: "number", required: true },
              { id: "F-5", label: "Notes", type: "textarea", required: false },
            ],
          },
        ],
      },
    ],
  }),

  init: () => {
    if (get().initialized) return;
    const demo = get().seed();
    set({
      treatments: demo.treatments,
      diagnosisTemplates: demo.diagnosisTemplates,
      clinicalFindingTemplates: demo.clinicalFindingTemplates,
      documentationTemplates: demo.documentationTemplates,
      initialized: true,
    });
  },

  // ---------- CATEGORY ----------
  setActiveCategory: (category) =>
    set(() => ({
      activeCategory: category,
      // ✅ optional: reset status when switching categories so you don't land on invalid value
      filters: { ...get().filters, status: "all" },
    })),

  // ✅ Filters actions
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  // ✅ Derived list (filtered by activeCategory)
  getFilteredList: () => {
    const { activeCategory, filters } = get();
    const q = String(filters.query || "").trim().toLowerCase();
    const status = filters.status;

    const includesQ = (text) => {
      if (!q) return true;
      return String(text || "").toLowerCase().includes(q);
    };

    if (activeCategory === "treatments") {
      return get().treatments.filter((t) => {
        const okQuery = includesQ(`${t.id} ${t.name} ${t.code} ${t.notes} ${t.fee}`);
        if (!okQuery) return false;
        if (status === "active" && !t.active) return false;
        if (status === "inactive" && t.active) return false;
        return true;
      });
    }

    if (activeCategory === "diagnosis") {
      return get().diagnosisTemplates.filter((d) => {
        const okQuery = includesQ(`${d.id} ${d.title} ${d.description}`);
        if (!okQuery) return false;
        if (status === "active" && !d.active) return false;
        if (status === "inactive" && d.active) return false;
        return true;
      });
    }

    if (activeCategory === "findings") {
      return get().clinicalFindingTemplates.filter((f) => {
        const okQuery = includesQ(`${f.id} ${f.title} ${f.description}`);
        if (!okQuery) return false;
        if (status === "active" && !f.active) return false;
        if (status === "inactive" && f.active) return false;
        return true;
      });
    }

    // docs
    return get().documentationTemplates.filter((t) => {
      const sectionsCount = t.sections?.length || 0;
      const fieldsCount = (t.sections || []).reduce((sum, s) => sum + (s.fields?.length || 0), 0);

      const okQuery = includesQ(`${t.id} ${t.name} ${sectionsCount} ${fieldsCount}`);
      if (!okQuery) return false;

      if (status === "enabled" && !t.enabled) return false;
      if (status === "disabled" && t.enabled) return false;

      return true;
    });
  },

  // ---------- MODAL ----------
  openCreate: (category) =>
    set({
      modal: { open: true, mode: "create", category, payload: null },
    }),

  openEdit: (category, payload) =>
    set({
      modal: { open: true, mode: "edit", category, payload },
    }),

  closeModal: () =>
    set({
      modal: { open: false, mode: "create", category: "treatments", payload: null },
    }),

  // ---------- CONFIRM ----------
  openConfirm: ({ title, message, onConfirmKey, onConfirmPayload }) =>
    set({
      confirm: { open: true, title, message, onConfirmKey, onConfirmPayload },
    }),

  closeConfirm: () =>
    set({
      confirm: { open: false, title: "", message: "", onConfirmKey: null, onConfirmPayload: null },
    }),

  runConfirm: () => {
    const { confirm } = get();
    if (!confirm.onConfirmKey) return;

    const actionMap = {
      deleteTreatment: (id) => get().deleteTreatment(id),
      deleteDiagnosis: (id) => get().deleteDiagnosis(id),
      deleteFinding: (id) => get().deleteFinding(id),
      deleteDocTemplate: (id) => get().deleteDocTemplate(id),
    };

    const fn = actionMap[confirm.onConfirmKey];
    if (fn) fn(confirm.onConfirmPayload);
    get().closeConfirm();
  },

  // ---------- CRUD: TREATMENTS ----------
  addTreatment: (data) =>
    set((state) => ({
      treatments: [
        ...state.treatments,
        {
          id: `TRM-${uid()}`,
          name: data.name.trim(),
          code: (data.code || "").trim(),
          fee: Number(data.fee || 0),
          active: data.active ?? true,
          notes: data.notes || "",
        },
      ],
    })),

  updateTreatment: (id, patch) =>
    set((state) => ({
      treatments: state.treatments.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  deleteTreatment: (id) =>
    set((state) => ({
      treatments: state.treatments.filter((t) => t.id !== id),
    })),

  toggleTreatmentActive: (id) =>
    set((state) => ({
      treatments: state.treatments.map((t) => (t.id === id ? { ...t, active: !t.active } : t)),
    })),

  // ---------- CRUD: DIAGNOSIS ----------
  addDiagnosis: (data) =>
    set((state) => ({
      diagnosisTemplates: [
        ...state.diagnosisTemplates,
        {
          id: `DX-${uid()}`,
          title: data.title.trim(),
          description: data.description || "",
          active: data.active ?? true,
        },
      ],
    })),

  updateDiagnosis: (id, patch) =>
    set((state) => ({
      diagnosisTemplates: state.diagnosisTemplates.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  deleteDiagnosis: (id) =>
    set((state) => ({
      diagnosisTemplates: state.diagnosisTemplates.filter((d) => d.id !== id),
    })),

  // ---------- CRUD: FINDINGS ----------
  addFinding: (data) =>
    set((state) => ({
      clinicalFindingTemplates: [
        ...state.clinicalFindingTemplates,
        {
          id: `CF-${uid()}`,
          title: data.title.trim(),
          description: data.description || "",
          active: data.active ?? true,
        },
      ],
    })),

  updateFinding: (id, patch) =>
    set((state) => ({
      clinicalFindingTemplates: state.clinicalFindingTemplates.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  deleteFinding: (id) =>
    set((state) => ({
      clinicalFindingTemplates: state.clinicalFindingTemplates.filter((f) => f.id !== id),
    })),

  // ---------- CRUD: DOC TEMPLATES ----------
  addDocTemplate: (data) =>
    set((state) => ({
      documentationTemplates: [
        ...state.documentationTemplates,
        {
          id: `DOC-${uid()}`,
          name: data.name.trim(),
          enabled: data.enabled ?? true,
          sections: data.sections || [],
        },
      ],
    })),

  updateDocTemplate: (id, patch) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  deleteDocTemplate: (id) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.filter((t) => t.id !== id),
    })),

  toggleDocTemplateEnabled: (id) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) =>
        t.id === id ? { ...t, enabled: !t.enabled } : t
      ),
    })),

  // Builder helpers (unchanged)
  addDocSection: (templateId, title) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: [...t.sections, { id: `SEC-${uid()}`, title: title.trim() || "New Section", fields: [] }],
        };
      }),
    })),

  updateDocSection: (templateId, sectionId, patch) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: t.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
        };
      }),
    })),

  deleteDocSection: (templateId, sectionId) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) => {
        if (t.id !== templateId) return t;
        return { ...t, sections: t.sections.filter((s) => s.id !== sectionId) };
      }),
    })),

  addDocField: (templateId, sectionId, field) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: t.sections.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              fields: [
                ...s.fields,
                {
                  id: `F-${uid()}`,
                  label: (field.label || "New Field").trim(),
                  type: field.type || "text",
                  required: !!field.required,
                  options: field.options || [],
                },
              ],
            };
          }),
        };
      }),
    })),

  updateDocField: (templateId, sectionId, fieldId, patch) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: t.sections.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
            };
          }),
        };
      }),
    })),

  deleteDocField: (templateId, sectionId, fieldId) =>
    set((state) => ({
      documentationTemplates: state.documentationTemplates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: t.sections.map((s) => {
            if (s.id !== sectionId) return s;
            return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
          }),
        };
      }),
    })),
}));