const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

async function request(path) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${baseURL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }

  return json; // { success, data }
}

export const permissionsApi = {
  getMy: () => request("/permissions/my"),
};