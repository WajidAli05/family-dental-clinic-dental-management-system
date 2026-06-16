// // import { create } from "zustand";
// // import { receptionistApi } from "@/lib/receptionistApi";

// // export const useReceptionistStore = create(() => ({
// //   stats: {
// //     appointmentsToday: 18,
// //     activePatients: 124,
// //     pendingLabSamples: 6,
// //     todayRevenue: 85000,
// //   },

// //   appointments: [
// //     {
// //       patient: "Ali Raza",
// //       dentist: "Dr. Ahmed",
// //       time: "10:30 AM",
// //       status: "Scheduled",
// //     },
// //     {
// //       patient: "Sara Khan",
// //       dentist: "Dr. Saif",
// //       time: "11:00 AM",
// //       status: "Completed",
// //     },
// //   ],

// //   labSamples: [
// //     {
// //       patient: "Hina Malik",
// //       sample: "Zirconia Crown",
// //       lab: "Smile Lab",
// //       status: "In Process",
// //     },
// //   ],

// //     // ✅ ADD (no removals)
// //   loading: false,
// //   error: null,

// //   stats: {
// //     totalPatients: 0,
// //     activePatients: 0,
// //     pendingLabSamples: 0,
// //     pendingInvoices: 0,
// //     totalRevenue: 0,
// //   },


// //   fetchDashboard: async ({ date } = {}) => {
// //     try {
// //       set({ loading: true, error: null });

// //       const d = date || new Date().toISOString().slice(0, 10);

// //       const [statsRes, apptRes, labRes] = await Promise.all([
// //         receptionistApi.getStats({ date: d }),
// //         receptionistApi.getAppointments({ date: d }),
// //         receptionistApi.getLabSamples({ date: d }),
// //       ]);

// //       set({
// //         stats: statsRes.data || get().stats,
// //         appointments: apptRes.data || [],
// //         labSamples: labRes.data || [],
// //         loading: false,
// //       });
// //     } catch (e) {
// //       set({ loading: false, error: e.message || "Failed to load dashboard" });
// //     }
// //   },

// //   fetchPatients: async ({ q } = {}) => {
// //     try {
// //       set({ loading: true, error: null });

// //       const res = await receptionistApi.getPatients(q ? { q } : undefined);
// //       // backend returns { success, data: [] }
// //       set({ patients: res.data || [], loading: false });
// //       return res.data || [];
// //     } catch (e) {
// //       set({ error: e.message, loading: false });
// //       return [];
// //     }
// //   },

// //   fetchPatientStats: async () => {
// //     try {
// //       const res = await receptionistApi.getPatientStats();
// //       set({ stats: res.data || get().stats });
// //       return res.data;
// //     } catch (e) {
// //       set({ error: e.message });
// //       return null;
// //     }
// //   },
// // }));

// import { create } from "zustand";
// import { receptionistApi } from "@/lib/receptionistApi";

// // ✅ LOCAL date (fixes timezone issues caused by toISOString() UTC)
// const localISODate = (d = new Date()) => {
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// };

// // ✅ normalize appointment row for dashboard usage
// const normalizeAppt = (a) => ({
//   id: a?.id || a?.publicId || a?._id || "",
//   patientName: a?.patientName || a?.patient || a?.patient?.name || "",
//   dentist: a?.dentist || a?.dentistName || a?.dentist?.name || "",
//   date: a?.date || "",
//   time: a?.time || "",
//   status: a?.status || "Scheduled",
// });

// export const useReceptionistStore = create((set, get) => ({
//   // ✅ dashboard expects these keys
//   stats: {
//     appointmentsToday: 0,
//     activePatients: 0,
//     pendingLabSamples: 0,
//     todayRevenue: 0,
//   },

//   appointments: [],
//   labSamples: [],

//   loading: false,
//   error: null,

//   fetchDashboard: async ({ date } = {}) => {
//     try {
//       set({ loading: true, error: null });

//       // ✅ IMPORTANT: use local date, not UTC
//       const d = date || localISODate();

//       const [statsRes, apptRes, labRes] = await Promise.all([
//         receptionistApi.getStats({ date: d }),
//         receptionistApi.getAppointments({ date: d }),
//         receptionistApi.getLabSamples({ date: d }),
//       ]);

//       // ✅ normalize appointments to avoid UI mapping issues
//       let appts = Array.isArray(apptRes?.data) ? apptRes.data.map(normalizeAppt) : [];

//       /**
//        * ✅ Fallback:
//        * If backend returns empty for a "date" query, it’s usually timezone/format mismatch.
//        * We do a second fetch without date to confirm and still show appointments.
//        */
//       if (!appts.length) {
//         try {
//           const apptResNoDate = await receptionistApi.getAppointments();
//           const all = Array.isArray(apptResNoDate?.data) ? apptResNoDate.data.map(normalizeAppt) : [];
//           appts = all.filter((x) => x.date === d); // still show today in UI
//         } catch {
//           // ignore fallback failure
//         }
//       }

//       set({
//         stats: statsRes?.data || get().stats,
//         appointments: appts,
//         labSamples: labRes?.data || [],
//         loading: false,
//       });
//     } catch (e) {
//       set({
//         loading: false,
//         error: e?.message || "Failed to load dashboard",
//       });
//     }
//   },

//   // Optional: use elsewhere if needed
//   fetchPatients: async ({ q } = {}) => {
//     try {
//       set({ loading: true, error: null });
//       const res = await receptionistApi.getPatients(q ? { q } : undefined);
//       set({ patients: res.data || [], loading: false });
//       return res.data || [];
//     } catch (e) {
//       set({ error: e.message, loading: false });
//       return [];
//     }
//   },

//   fetchPatientStats: async () => {
//     try {
//       const res = await receptionistApi.getPatientStats();
//       // NOTE: patientStats endpoint returns different shape, so don't overwrite dashboard stats blindly
//       return res.data || null;
//     } catch (e) {
//       set({ error: e.message });
//       return null;
//     }
//   },
// }));

import { create } from "zustand";
import { receptionistApi } from "@/lib/receptionistApi";

// ✅ LOCAL date (fixes timezone issues caused by toISOString() UTC)
const localISODate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ✅ normalize appointment row for dashboard usage
const normalizeAppt = (a) => ({
  id: a?.id || a?.publicId || a?._id || "",
  patientName: a?.patientName || a?.patient || a?.patient?.name || "",
  dentist: a?.dentist || a?.dentistName || a?.dentist?.name || "",
  date: a?.date || "",
  time: a?.time || "",
  status: a?.status || "Scheduled",
});

export const useReceptionistStore = create((set, get) => ({
  // ✅ dashboard expects these keys
  stats: {
    appointmentsToday: 0,
    activePatients: 0,
    pendingLabSamples: 0,
    todayRevenue: 0,
  },

  appointments: [],
  labSamples: [],

  // ✅ merged profile state (new)
  profile: {
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "receptionist",
    original: null,
  },

  loading: false,
  error: null,

  // ---------------- DASHBOARD ----------------
  fetchDashboard: async ({ date } = {}) => {
    try {
      set({ loading: true, error: null });

      const d = date || localISODate();

      const [statsRes, apptRes, labRes] = await Promise.all([
        receptionistApi.getStats({ date: d }),
        receptionistApi.getAppointments({ date: d }),
        receptionistApi.getLabSamples({ date: d }),
      ]);

      let appts = Array.isArray(apptRes?.data)
        ? apptRes.data.map(normalizeAppt)
        : [];

      // ✅ fallback fetch if date filtering fails
      if (!appts.length) {
        try {
          const apptResNoDate = await receptionistApi.getAppointments();
          const all = Array.isArray(apptResNoDate?.data)
            ? apptResNoDate.data.map(normalizeAppt)
            : [];
          appts = all.filter((x) => x.date === d);
        } catch {
          // ignore
        }
      }

      set({
        stats: statsRes?.data || get().stats,
        appointments: appts,
        labSamples: labRes?.data || [],
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Failed to load dashboard",
      });
    }
  },

  // ---------------- PROFILE ----------------
  fetchProfile: async () => {
    try {
      set({ loading: true, error: null });

      const res = await receptionistApi.getMe(); // GET /receptionist/me
      const u = res?.data || {};

      set({
        profile: {
          id: u.publicId || u._id || "",
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          role: u.role || "receptionist",
          address: u.address || "",
          joinedOn: u.createdAt
            ? new Date(u.createdAt).toISOString().slice(0, 10)
            : "",
          original: u,
        },
        loading: false,
      });

      return u;
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Failed to load profile",
      });
      return null;
    }
  },

  updateProfile: async (payload) => {
    try {
      set({ loading: true, error: null });

      const body = {
        name: payload?.name,
        email: payload?.email,
        phone: payload?.phone,
      };

      const res = await receptionistApi.updateMe(body); // PATCH /receptionist/me
      const u = res?.data || {};

      set({
        profile: {
          ...get().profile,
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          original: u,
        },
        loading: false,
      });

      return u;
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Failed to update profile",
      });
      throw e;
    }
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    try {
      set({ loading: true, error: null });

      if (!currentPassword || !newPassword) {
        throw new Error("Current password and new password are required");
      }

      await receptionistApi.changePassword({
        currentPassword,
        newPassword,
      }); // PATCH /receptionist/me/password

      set({ loading: false });
      return true;
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Failed to change password",
      });
      throw e;
    }
  },

  // ---------------- OPTIONAL EXISTING ----------------
  fetchPatients: async ({ q } = {}) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistApi.getPatients(q ? { q } : undefined);
      set({ patients: res.data || [], loading: false });
      return res.data || [];
    } catch (e) {
      set({ error: e.message, loading: false });
      return [];
    }
  },

  fetchPatientStats: async () => {
    try {
      const res = await receptionistApi.getPatientStats();
      return res.data || null;
    } catch (e) {
      set({ error: e.message });
      return null;
    }
  },
}));