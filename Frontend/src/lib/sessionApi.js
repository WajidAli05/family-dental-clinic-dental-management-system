import { useUserStore } from "@/store/userStore";
import { handleUnauthorized } from "./httpClient";

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
  if (res.status === 401) handleUnauthorized(path);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return json;
}

export const sessionApi = {
  getLoginHistory:   () => request("/auth/session/login-history"),
  logoutAllDevices:  () => request("/auth/session/logout-all-devices", { method: "POST" }),
};
