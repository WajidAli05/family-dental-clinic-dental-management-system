import { create } from "zustand";
import { receptionistApi } from "@/lib/receptionistApi";

export const usePatientStore = create((set, get) => ({
  // Patient data
  patients: [
    {
      mr: 1,
      name: "Ali Raza",
      age: 32,
      gender: "Male",
      phone: "+92 300 1234567",
      address: "House 123, Street 5, F-10, Islamabad",
      registrationDate: "2024-01-15",
      lastVisit: "2024-12-15",
      treatments: [
        {
          mr: 1,
          date: "2024-12-15",
          dentist: "Dr. Ahmed",
          procedure: "Root Canal",
          tooth: "16",
          status: "Completed",
          amount: 15000
        },
        {
          mr: 2,
          date: "2024-11-20",
          dentist: "Dr. Saif",
          procedure: "Cleaning",
          status: "Completed",
          amount: 3000
        }
      ],
      labSamples: [
        {
          mr: 1,
          date: "2024-12-15",
          sample: "Crown Impression",
          lab: "Smile Lab",
          status: "In Process",
          expectedDate: "2024-12-25"
        }
      ],
      invoices: [
        {
          mr: 1,
          date: "2024-12-15",
          amount: 15000,
          status: "Pending",
          dueDate: "2024-12-22"
        },
        {
          mr: 2,
          date: "2024-11-20",
          amount: 3000,
          status: "Pamr"
        }
      ],
      prescriptions: [
        {
          mr: 1,
          date: "2024-12-15",
          medications: ["Amoxicillin 500mg", "Ibuprofen 400mg"],
          doctor: "Dr. Ahmed"
        }
      ],
      xrays: [
        {
          mr: 1,
          date: "2024-12-15",
          type: "Panoramic",
          notes: "Pre-treatment assessment"
        }
      ]
    },
    {
      mr: 2,
      name: "Sara Khan",
      age: 28,
      gender: "Female",
      phone: "+92 301 7654321",
      address: "Flat 45, Block C, Bahria Town, Rawalpindi",
      registrationDate: "2024-02-20",
      lastVisit: "2024-12-17",
      treatments: [
        {
          mr: 3,
          date: "2024-12-17",
          dentist: "Dr. Saif",
          procedure: "Teeth Whitening",
          status: "Completed",
          amount: 12000
        }
      ],
      labSamples: [],
      invoices: [
        {
          mr: 3,
          date: "2024-12-17",
          amount: 12000,
          status: "Pamr"
        }
      ],
      prescriptions: [],
      xrays: []
    },
    {
      mr: 3,
      name: "Hina Malik",
      age: 35,
      gender: "Female",
      phone: "+92 333 9876543",
      address: "Plot 78, G-11/3, Islamabad",
      registrationDate: "2023-11-10",
      lastVisit: "2024-12-10",
      treatments: [
        {
          mr: 4,
          date: "2024-12-10",
          dentist: "Dr. Ahmed",
          procedure: "Crown Placement",
          tooth: "26",
          status: "Completed",
          amount: 25000
        }
      ],
      labSamples: [
        {
          mr: 2,
          date: "2024-12-10",
          sample: "Zirconia Crown",
          lab: "Smile Lab",
          status: "In Process",
          expectedDate: "2024-12-20"
        }
      ],
      invoices: [
        {
          mr: 4,
          date: "2024-12-10",
          amount: 25000,
          status: "Pending",
          dueDate: "2024-12-20"
        },
        {
          mr: 5,
          date: "2024-11-05",
          amount: 8000,
          status: "Pending",
          dueDate: "2024-12-15"
        }
      ],
      prescriptions: [
        {
          mr: 2,
          date: "2024-12-10",
          medications: ["Paracetamol 500mg"],
          doctor: "Dr. Ahmed"
        }
      ],
      xrays: [
        {
          mr: 2,
          date: "2024-12-10",
          type: "Periapical",
          notes: "Crown preparation"
        }
      ]
    },
    {
      mr: 4,
      name: "Ahmed Hassan",
      age: 45,
      gender: "Male",
      phone: "+92 321 4567890",
      address: "House 56, Satellite Town, Rawalpindi",
      registrationDate: "2023-08-05",
      lastVisit: "2024-12-12",
      treatments: [
        {
          mr: 5,
          date: "2024-12-12",
          dentist: "Dr. Ahmed",
          procedure: "Implant Consultation",
          status: "Completed",
          amount: 5000
        }
      ],
      labSamples: [],
      invoices: [
        {
          mr: 6,
          date: "2024-12-12",
          amount: 5000,
          status: "Pamr"
        }
      ],
      prescriptions: [],
      xrays: [
        {
          mr: 3,
          date: "2024-12-12",
          type: "CBCT",
          notes: "Implant planning"
        }
      ]
    },
    {
      mr: 5,
      name: "Fatima Zahoor",
      age: 26,
      gender: "Female",
      phone: "+92 345 1122334",
      address: "Apartment 12, I-8, Islamabad",
      registrationDate: "2024-06-18",
      lastVisit: "2024-12-16",
      treatments: [
        {
          mr: 6,
          date: "2024-12-16",
          dentist: "Dr. Saif",
          procedure: "Filling",
          tooth: "36",
          status: "Completed",
          amount: 4000
        }
      ],
      labSamples: [],
      invoices: [
        {
          mr: 7,
          date: "2024-12-16",
          amount: 4000,
          status: "Pending",
          dueDate: "2024-12-23"
        }
      ],
      prescriptions: [
        {
          mr: 3,
          date: "2024-12-16",
          medications: ["Ibuprofen 400mg"],
          doctor: "Dr. Saif"
        }
      ],
      xrays: []
    }
  ],

  // Actions
  addPatient: (patient) => 
    set((state) => ({
      patients: [
        ...state.patients,
        {
          ...patient,
          mr: state.patients.length + 1,
          registrationDate: new Date().toISOString().split('T')[0],
          treatments: [],
          labSamples: [],
          invoices: [],
          prescriptions: [],
          xrays: []
        }
      ]
    })),

  updatePatient: (mr, updates) =>
    set((state) => ({
      patients: state.patients.map((patient) =>
        patient.mr === mr 
          ? { ...patient, ...updates }
          : patient
      )
    })),

  getPatientBymr: (mr) => {
    const state = get();
    return state.patients.find((patient) => patient.mr === mr);
  },

  searchPatients: (query) => {
    const state = get();
    if (!query) return state.patients;
    
    const lowerQuery = query.toLowerCase();
    return state.patients.filter((patient) =>
      patient.name.toLowerCase().includes(lowerQuery) ||
      patient.phone.toLowerCase().includes(lowerQuery) ||
      patient.address.toLowerCase().includes(lowerQuery)
    );
  },

  // Statistics
  getStats: () => {
    const state = get();
    const totalPatients = state.patients.length;
    const pendingInvoices = state.patients.reduce(
      (sum, p) => sum + p.invoices.filter(inv => inv.status === "Pending").length,
      0
    );
    const pendingLabSamples = state.patients.reduce(
      (sum, p) => sum + p.labSamples.filter(lab => lab.status === "In Process").length,
      0
    );
    const totalRevenue = state.patients.reduce(
      (sum, p) => sum + p.invoices.reduce((invSum, inv) => invSum + inv.amount, 0),
      0
    );

    return {
      totalPatients,
      pendingInvoices,
      pendingLabSamples,
      totalRevenue
    };
  },

  loading: false,
error: null,

createPatient: async (payload) => {
  try {
    set({ loading: true, error: null });
    const res = await receptionistApi.createPatient(payload); // { success, data }

    // We can either refetch or optimistically add.
    // Optimistic add keeps UI snappy and works even if list isn’t refetched yet:
    set((state) => ({
      patients: [res.data, ...state.patients],
      loading: false,
    }));

    return res.data;
  } catch (e) {
    set({ loading: false, error: e.message });
    throw e;
  }
},

fetchPatients: async ({ q } = {}) => {
  try {
    set({ loading: true, error: null });
    const res = await receptionistApi.getPatients(q ? { q } : undefined);
    set({ patients: res.data || [], loading: false });
    return res.data || [];
  } catch (e) {
    set({ loading: false, error: e.message });
    return [];
  }
},

fetchPatientStats: async () => {
  try {
    const res = await receptionistApi.getPatientStats();
    // store stats if you added stats previously
    set({ stats: res.data });
    return res.data;
  } catch (e) {
    set({ error: e.message });
    return null;
  }
},
}));