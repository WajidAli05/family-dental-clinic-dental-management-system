import { create } from "zustand";

export const useProfileStore = create((set) => ({
  profile: {
    id: "REC-001",
    name: "Ayesha Khan",
    email: "reception@fdc.com",
    phone: "+92 300 1112233",
    address: "Saddar, Rawalpindi",
    role: "Receptionist",
    joinedOn: "2023-06-10",
    avatar: null,
  },

  stats: {
    patientsRegistered: 184,
    appointmentsHandled: 1320,
    invoicesProcessed: 540,
  },

  updateProfile: (updates) =>
    set((state) => ({
      profile: { ...state.profile, ...updates },
    })),

  changePassword: (oldPass, newPass) => {
    console.log("Password updated", oldPass, newPass);
    return true;
  },
}));