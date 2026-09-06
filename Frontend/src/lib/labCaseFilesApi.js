import { handleUnauthorized } from "./httpClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Lab case attachments, one module for every role.
 *
 * The four roles reach the same controller through different route prefixes,
 * so the ONLY thing that varies is the path. Keeping that in a single map
 * avoids a fourth copy of upload/list logic — the pattern that has repeatedly
 * caused the roles to drift apart in this codebase.
 *
 * The receptionist has no upload entry on purpose: the front desk may read
 * attachments but not author them, and the backend refuses the write too.
 */
const PATHS = {
  owner:        (id) => `/owner/lab-cases/${encodeURIComponent(id)}/files`,
  dentist:      (id) => `/dentist/cases/${encodeURIComponent(id)}/files`,
  lab:          (id) => `/lab/cases/${encodeURIComponent(id)}/files`,
  receptionist: (id) => `/receptionist/lab-samples/${encodeURIComponent(id)}/files`,
};

/** Download prefixes. The lab-scoped path is gated on the LAB-SAMPLES tab, not
 *  the patients tab, so a clinician with lab access but no patient-records tab
 *  can still open a case attachment. */
const DOWNLOAD = {
  owner:        (fid) => `/owner/files/${encodeURIComponent(fid)}`,
  dentist:      (fid) => `/dentist/lab-files/${encodeURIComponent(fid)}`,
  lab:          (fid) => `/lab/files/${encodeURIComponent(fid)}`,
  receptionist: (fid) => `/receptionist/lab-files/${encodeURIComponent(fid)}`,
};

/**
 * Capability policy for the calling role, so the UI renders only controls the
 * server would honour. VIEW/DOWNLOAD is available to every role that can see
 * the case; UPLOAD excludes the receptionist, which has no upload route at all.
 */
export function labCaseFilePolicy(role) {
  const r = String(role || "").toLowerCase();
  const known = ["owner", "dentist", "lab", "receptionist"].includes(r);
  return {
    canView: known,
    canDownload: known,
    canUpload: ["owner", "dentist", "lab"].includes(r),
  };
}

export const canUploadLabCaseFiles = (role) => labCaseFilePolicy(role).canUpload;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function handle(res) {
  const ct = res.headers.get("content-type") || "";
  const json = ct.includes("application/json") ? await res.json() : null;
  if (res.status === 401) handleUnauthorized("");
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json;
}

export async function listLabCaseFiles(role, caseId, { page = 1, limit = 20 } = {}) {
  const path = PATHS[String(role || "").toLowerCase()];
  if (!path) throw new Error("Unknown role");
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await fetch(`${API_BASE}${path(caseId)}?${qs}`, { headers: authHeader() });
  return handle(res);
}

/**
 * Streams a file and hands the viewer a save dialog. Uses a blob URL because
 * the endpoint requires an Authorization header, so a bare <a href> cannot
 * fetch it.
 */
export async function downloadLabCaseFile(role, fileId, filename = "attachment") {
  const path = DOWNLOAD[String(role || "").toLowerCase()];
  if (!path) throw new Error("Unknown role");
  const res = await fetch(`${API_BASE}${path(fileId)}`, { headers: authHeader() });
  if (res.status === 401) handleUnauthorized("");
  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    const j = ct.includes("application/json") ? await res.json().catch(() => null) : null;
    throw new Error(j?.message || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function uploadLabCaseFiles(role, caseId, files, { note = "" } = {}) {
  if (!canUploadLabCaseFiles(role)) throw new Error("Your role cannot add attachments");
  const fd = new FormData();
  for (const f of files) fd.append("file", f);
  if (note) fd.append("note", note);
  // No Content-Type header: the browser must set the multipart boundary.
  const res = await fetch(`${API_BASE}${PATHS[role](caseId)}`, {
    method: "POST",
    headers: authHeader(),
    body: fd,
  });
  return handle(res);
}
