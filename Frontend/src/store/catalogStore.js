import { create } from "zustand";
import { receptionistBillingApi } from "@/lib/receptionistBillingApi";
import { dentistApi } from "@/lib/dentistApi";

export const useCatalogStore = create((set, get) => ({
  treatments: [],
  sampleTypes: [],
  treatmentsLoaded: false,
  sampleTypesLoaded: false,
  loading: false,
  error: null,

  // Fetch as receptionist role
  fetchAsReceptionist: async (force = false) => {
    if (get().treatmentsLoaded && get().sampleTypesLoaded && !force) return;
    set({ loading: true, error: null });
    try {
      const [tRes, sRes] = await Promise.all([
        receptionistBillingApi.getCatalogTreatments({ limit: 500 }),
        receptionistBillingApi.getCatalogSampleTypes({ limit: 500 }),
      ]);
      set({
        treatments: tRes.rows || [],
        sampleTypes: sRes.rows || [],
        treatmentsLoaded: true,
        sampleTypesLoaded: true,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  // Fetch as dentist role
  fetchAsDentist: async (force = false) => {
    if (get().treatmentsLoaded && get().sampleTypesLoaded && !force) return;
    set({ loading: true, error: null });
    try {
      const [tRes, sRes] = await Promise.all([
        dentistApi.getCatalogTreatments({ limit: 500 }),
        dentistApi.getCatalogSampleTypes({ limit: 500 }),
      ]);
      set({
        treatments: tRes.rows || [],
        sampleTypes: sRes.rows || [],
        treatmentsLoaded: true,
        sampleTypesLoaded: true,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  refetch: () => {
    set({ treatmentsLoaded: false, sampleTypesLoaded: false });
  },
}));
