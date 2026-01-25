const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function request(path, options = {}) {
  const token = localStorage.getItem("token"); // later real JWT
  const labId = localStorage.getItem("labId") || "LAB-USER-1"; // TEMP dev until auth

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // TEMP: until auth exists (backend uses this to identify lab)
      "X-Lab-Id": labId,
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const json = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const message = json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};