import { useUserStore } from "@/store/userStore";
import { handleUnauthorized } from "./httpClient";

const baseURL = import.meta.env.VITE_API_BASE_URL;

function authHeader() {
  const token = useUserStore.getState().token || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getJson(path) {
  const res = await fetch(`${baseURL}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized(path);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return json;
}

// Downloads a file response (JSON/CSV export) via a temporary <a> — these
// endpoints return raw attachment bodies, not { success, data } envelopes.
async function downloadFile(path, fallbackFilename) {
  const res = await fetch(`${baseURL}${path}`, { headers: authHeader() });

  if (res.status === 401) {
    handleUnauthorized(path);
    return;
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }

  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : fallbackFilename;

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const dataExportApi = {
  getExportableCollections: () => getJson("/owner/data-export/collections"),
  downloadJson: () => downloadFile("/owner/data-export/json", "fdc-export.json"),
  downloadCsv:  (collection) => downloadFile(`/owner/data-export/csv/${collection}`, `fdc-export-${collection}.csv`),
};
