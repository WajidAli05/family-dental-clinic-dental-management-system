const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

async function request(path, { method = "GET", body, params } = {}) {
  const token = localStorage.getItem("token");

  const url = new URL(baseURL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, v);
      }
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Request failed");
  }

  return data; // { success, data }
}

export const receptionistBillingApi = {
  listInvoices: (params) => request("/receptionist/invoices", { params }),
  getStats: (params) => request("/receptionist/billing/stats", { params }),
  listLabBills: (params) => request("/receptionist/lab-bills", { params }),

  // payments
  addPayment: (invoiceId, body) =>
    request(`/receptionist/invoices/${invoiceId}/payments`, { method: "POST", body }),

  updatePayment: (invoiceId, paymentId, body) =>
    request(`/receptionist/invoices/${invoiceId}/payments/${paymentId}`, { method: "PATCH", body }),

  deletePayment: (invoiceId, paymentId) =>
    request(`/receptionist/invoices/${invoiceId}/payments/${paymentId}`, { method: "DELETE" }),

  // ✅ optional invoice creation
  createInvoice: (body) =>
    request(`/receptionist/invoices`, { method: "POST", body }),
};