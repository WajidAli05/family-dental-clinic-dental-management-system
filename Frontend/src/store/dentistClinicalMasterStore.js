import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

export const useDentistClinicalMasterStore = create((set, get) => ({
  loading: false,
  loaded: false,
  error: null,

  treatments: [],
  diagnosisTemplates: [],
  clinicalFindingTemplates: [],

  fetchClinicalMaster: async () => {
    // prevent refetch spam
    if (get().loading) return;

    try {
      set({ loading: true, error: null });

      const res = await dentistApi.getClinicalMaster();
      const data = res?.data || {};

      set({
        treatments: Array.isArray(data.treatments) ? data.treatments : [],
        diagnosisTemplates: Array.isArray(data.diagnosisTemplates) ? data.diagnosisTemplates : [],
        clinicalFindingTemplates: Array.isArray(data.clinicalFindingTemplates)
          ? data.clinicalFindingTemplates
          : [],
        loaded: true,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        loaded: true,
        error: e?.message || "Failed to load clinical master",
        treatments: [],
        diagnosisTemplates: [],
        clinicalFindingTemplates: [],
      });
    }
  },
}));