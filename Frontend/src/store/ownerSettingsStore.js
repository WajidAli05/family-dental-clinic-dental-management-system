// src/store/ownerSettingsStore.js
import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const normalizeClinic = (c) => ({
  name: c?.name || "",
  logoUrl: c?.logoUrl || "",
  phone: c?.phone || "",
  whatsapp: c?.whatsapp || "",
  address: c?.address || "",
});

const normalizeBilling = (b) => ({
  defaultConsultationFee: Number(b?.defaultConsultationFee) || 0,
});

const normalizeRetention = (r) => ({
  patientRecordsYears: Number(r?.patientRecordsYears) || 7,
  financialRecordsYears: Number(r?.financialRecordsYears) || 7,
  auditLogYears: Number(r?.auditLogYears) || 7,
});

export const useOwnerSettingsStore = create((set, get) => ({
  initialized: false,
  loading: false,

  clinic: normalizeClinic(null),
  billing: normalizeBilling(null),
  retention: normalizeRetention(null),

  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    await get().fetchSettings();
  },

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const res = await ownerApi.getOwnerSettings();
      const data = res?.data || {};
      set({
        clinic: normalizeClinic(data.clinic),
        billing: normalizeBilling(data.billing),
        retention: normalizeRetention(data.retention),
      });
    } catch (e) {
      console.error("fetchSettings failed", e);
    } finally {
      set({ loading: false });
    }
  },

  updateClinic: async (clinicPatch) => {
    set({ loading: true });
    try {
      const payload = { clinic: normalizeClinic(clinicPatch) };
      const res = await ownerApi.updateOwnerSettings(payload);
      const data = res?.data || {};
      set({
        clinic: normalizeClinic(data.clinic),
        billing: normalizeBilling(data.billing),
        retention: normalizeRetention(data.retention),
      });
      return true;
    } finally {
      set({ loading: false });
    }
  },

  updateBilling: async (billingPatch) => {
    set({ loading: true });
    try {
      const payload = { billing: normalizeBilling(billingPatch) };
      const res = await ownerApi.updateOwnerSettings(payload);
      const data = res?.data || {};
      set({
        clinic: normalizeClinic(data.clinic),
        billing: normalizeBilling(data.billing),
        retention: normalizeRetention(data.retention),
      });
      return true;
    } finally {
      set({ loading: false });
    }
  },

  updateRetention: async (retentionPatch) => {
    set({ loading: true });
    try {
      const payload = { retention: normalizeRetention(retentionPatch) };
      const res = await ownerApi.updateOwnerSettings(payload);
      const data = res?.data || {};
      set({
        clinic: normalizeClinic(data.clinic),
        billing: normalizeBilling(data.billing),
        retention: normalizeRetention(data.retention),
      });
      return true;
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async ({ newPassword, confirmPassword }) => {
    set({ loading: true });
    try {
      await ownerApi.changeOwnerPassword({ newPassword, confirmPassword });
      return true;
    } finally {
      set({ loading: false });
    }
  },
}));