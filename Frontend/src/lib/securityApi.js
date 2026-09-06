import { useUserStore } from "@/store/userStore";
import { handleUnauthorized } from "./httpClient";

const baseURL = import.meta.env.VITE_API_BASE_URL;

/** Route prefix for the signed-in role; falls back to owner. */
function notifBase() {
  const role = String(useUserStore.getState().currentUser?.role || "").toLowerCase();
  return ["owner", "dentist", "lab", "receptionist"].includes(role) ? `/${role}` : "/owner";
}

async function request(path, { method = "GET", body } = {}) {
  const token = useUserStore.getState().token || localStorage.getItem("token");
  const res = await fetch(`${baseURL}${path}`, {
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
  return json;
}

export const securityApi = {
  getLockedAccounts: ()         => request("/owner/security/locked-accounts"),
  unlock:            (userId)   => request(`/owner/security/unlock/${userId}`, { method: "POST" }),

  getStaffLoginHistory: (publicId) => request(`/owner/security/login-history/${publicId}`),

  // Notifications are mounted under every role's prefix and the controller
  // scopes each query to req.user._id, so the ONLY thing that varies is the
  // path. Deriving it from the signed-in role keeps one client for all roles.
  getNotifications:  ()         => request(`${notifBase()}/notifications`),
  markRead:          (id)       => request(`${notifBase()}/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead:       ()         => request(`${notifBase()}/notifications/read-all`,   { method: "PATCH" }),
};
