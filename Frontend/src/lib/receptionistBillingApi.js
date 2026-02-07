// const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// async function request(path, { method = "GET", body, params } = {}) {
//   const token = localStorage.getItem("token");

//   const url = new URL(baseURL + path);
//   if (params) {
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && String(v).trim() !== "") {
//         url.searchParams.set(k, v);
//       }
//     });
//   }

//   const res = await fetch(url.toString(), {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: body ? JSON.stringify(body) : undefined,
//   });

//   const data = await res.json().catch(() => ({}));

//   if (!res.ok || data?.success === false) {
//     throw new Error(data?.message || "Request failed");
//   }

//   return data; // { success, data }
// }

// export const receptionistBillingApi = {
//   listInvoices: (params) => request("/receptionist/invoices", { params }),
//   getStats: (params) => request("/receptionist/billing/stats", { params }),
//   listLabBills: (params) => request("/receptionist/lab-bills", { params }),

//   // payments
//   addPayment: (invoiceId, body) =>
//     request(`/receptionist/invoices/${invoiceId}/payments`, { method: "POST", body }),

//   updatePayment: (invoiceId, paymentId, body) =>
//     request(`/receptionist/invoices/${invoiceId}/payments/${paymentId}`, { method: "PATCH", body }),

//   deletePayment: (invoiceId, paymentId) =>
//     request(`/receptionist/invoices/${invoiceId}/payments/${paymentId}`, { method: "DELETE" }),

//   // ✅ optional invoice creation
//   createInvoice: (body) =>
//     request(`/receptionist/invoices`, { method: "POST", body }),
// };

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

async function request(path, { method = "GET", body, params } = {}) {
  const token = localStorage.getItem("token");

  const url = new URL(baseURL + path);

  // ✅ attach query params
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  // ✅ normalize backend errors
  if (!res.ok || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed (${res.status} ${res.statusText})`
    );
  }

  return data; // { success, data }
}

/**
 * ✅ Billing APIs (Invoices + Payments + Stats + Lab Bills)
 * Matches your receptionist.routes.js
 */
export const receptionistBillingApi = {
  // ---------- INVOICES ----------
  listInvoices: (params) => request("/receptionist/invoices", { params }),

  // ✅ NEW: create invoice (backend should have POST /receptionist/invoices)
  createInvoice: (body) =>
    request("/receptionist/invoices", { method: "POST", body }),

  // ---------- BILLING / STATS ----------
  getStats: (params) => request("/receptionist/billing/stats", { params }),

  // ---------- LAB BILLS ----------
  listLabBills: (params) => request("/receptionist/lab-bills", { params }),

  // ---------- PAYMENTS ----------
  addPayment: (invoiceId, body) =>
    request(`/receptionist/invoices/${invoiceId}/payments`, {
      method: "POST",
      body,
    }),

  updatePayment: (invoiceId, paymentId, body) =>
    request(`/receptionist/invoices/${invoiceId}/payments/${paymentId}`, {
      method: "PATCH",
      body,
    }),

  deletePayment: (invoiceId, paymentId) =>
    request(`/receptionist/invoices/${invoiceId}/payments/${paymentId}`, {
      method: "DELETE",
    }),
};

/**
 * ✅ Inventory APIs
 * If you added these routes (recommended):
 *  GET    /receptionist/inventory
 *  GET    /receptionist/inventory/stats
 *  POST   /receptionist/inventory
 *  PATCH  /receptionist/inventory/:id
 *  DELETE /receptionist/inventory/:id
 */
export const receptionistInventoryApi = {
  listInventory: (params) => request("/receptionist/inventory", { params }),
  getInventoryStats: (params) =>
    request("/receptionist/inventory/stats", { params }),

  createInventoryItem: (body) =>
    request("/receptionist/inventory", { method: "POST", body }),

  updateInventoryItem: (id, body) =>
    request(`/receptionist/inventory/${id}`, { method: "PATCH", body }),

  deleteInventoryItem: (id) =>
    request(`/receptionist/inventory/${id}`, { method: "DELETE" }),
};

/**
 * ✅ (Optional) Shared receptionist API wrapper for other modules
 * Add more endpoints here when needed.
 */
export const receptionistApi = {
  // Dentists list (already in your routes)
  getDentists: (params) => request("/receptionist/dentists", { params }),

  // Patients
  listPatients: (params) => request("/receptionist/patients", { params }),
  lookupPatient: (params) => request("/receptionist/patients/lookup", { params }),

  // Appointments
  listAppointments: (params) => request("/receptionist/appointments", { params }),
  createAppointment: (body) =>
    request("/receptionist/appointments", { method: "POST", body }),
  updateAppointmentStatus: (id, body) =>
    request(`/receptionist/appointments/${id}/status`, { method: "PATCH", body }),

  // Labs (for LabSamples modals)
  getLabs: (params) => request("/receptionist/labs", { params }),
  getSampleTypes: (params) => request("/receptionist/sample-types", { params }),

  // Lab Samples
  listLabSamples: (params) => request("/receptionist/lab-samples", { params }),
  createLabSample: (body) =>
    request("/receptionist/lab-samples", { method: "POST", body }),
  updateLabSample: (id, body) =>
    request(`/receptionist/lab-samples/${id}`, { method: "PATCH", body }),
  updateLabSampleStatus: (id, body) =>
    request(`/receptionist/lab-samples/${id}/status`, { method: "PATCH", body }),
  deliverLabSample: (id) =>
    request(`/receptionist/lab-samples/${id}/deliver`, { method: "PATCH" }),
  deleteLabSample: (id) =>
    request(`/receptionist/lab-samples/${id}`, { method: "DELETE" }),
};