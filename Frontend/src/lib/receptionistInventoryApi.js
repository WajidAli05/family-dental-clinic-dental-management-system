import { handleUnauthorized } from "./httpClient";

const baseURL = import.meta.env.VITE_API_BASE_URL;

function buildUrl(path, params) {
  const url = new URL(baseURL + path);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function request(path, { method = "GET", params, body } = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(buildUrl(path, params), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (res.status === 401) handleUnauthorized(path);

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }

  return json; // { success, data }
}

export const receptionistInventoryApi = {
  list: (params) => request("/receptionist/inventory", { params }),
  stats: () => request("/receptionist/inventory/stats"),
  listSuppliers: (params) => request("/receptionist/inventory/suppliers", { params }),

  create: (body) =>
    request("/receptionist/inventory", { method: "POST", body }),

  update: (id, body) =>
    request(`/receptionist/inventory/${id}`, { method: "PATCH", body }),

  // Parity with the owner's add/subtract/set flow — same shared backend math.
  updateStock: (id, body) =>
    request(`/receptionist/inventory/${id}/stock`, { method: "PATCH", body }),

  remove: (id) =>
    request(`/receptionist/inventory/${id}`, { method: "DELETE" }),

  // ── Suppliers (full CRUD; recording a payment is owner-only, no route here) ──
  createSupplier: (body) => request("/receptionist/suppliers", { method: "POST", body }),
  updateSupplier: (id, body) => request(`/receptionist/suppliers/${id}`, { method: "PATCH", body }),
  deleteSupplier: (id) => request(`/receptionist/suppliers/${id}`, { method: "DELETE" }),
  getSupplierLedger: (id, params) => request(`/receptionist/suppliers/${id}/ledger`, { params }),

  // ── Purchase orders (create/receive; no delete route here — owner-only) ──
  listPurchaseOrders: (params) => request("/receptionist/inventory/purchases", { params }),
  getPurchaseOrder: (id) => request(`/receptionist/inventory/purchases/${id}`),
  createPurchaseOrder: (body) => request("/receptionist/inventory/purchases", { method: "POST", body }),
  updatePurchaseOrderStatus: (id, status) => request(`/receptionist/inventory/purchases/${id}/status`, { method: "PATCH", body: { status } }),
  receivePurchaseOrder: (id, body) => request(`/receptionist/inventory/purchases/${id}/receive`, { method: "PATCH", body }),
};