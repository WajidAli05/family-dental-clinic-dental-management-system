import { useUserStore } from "@/store/userStore";

const baseURL = import.meta.env.VITE_API_BASE_URL;

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
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return json;
}

export const securityApi = {
  getLockedAccounts: ()         => request("/owner/security/locked-accounts"),
  unlock:            (userId)   => request(`/owner/security/unlock/${userId}`, { method: "POST" }),

  getNotifications:  ()         => request("/owner/notifications"),
  markRead:          (id)       => request(`/owner/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead:       ()         => request("/owner/notifications/read-all",   { method: "PATCH" }),
};
