import { create } from "zustand";

export const usePermissionsStore = create(() => ({
  // later you will manage this from Owner > Permissions tab
  permissions: {
    owner: {
      patients: {
        canDelete: false, // ✅ toggle this to true to enable delete UI/action
      },
    },
  },

  canOwnerDeletePatients: () => false,
}));