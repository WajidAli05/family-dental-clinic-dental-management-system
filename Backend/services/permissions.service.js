import Permissions from "../models/Permissions.model.js";

const PERMISSIONS_DOC_ID = "PERMISSIONS";
const PERMISSION_ROLES = ["receptionist", "dentist"];

// Must match owner keys (keep in sync)
export const OWNER_PERMISSION_KEYS = [
  // receptionist tabs
  "tab_receptionist_dashboard",
  "tab_receptionist_patients",
  "tab_receptionist_appointments",
  "tab_receptionist_lab_samples",
  "tab_receptionist_billing",
  "tab_receptionist_inventory",
  "tab_receptionist_profile",

  // dentist tabs
  "tab_dentist_dashboard",
  "tab_dentist_appointments",
  "tab_dentist_lab_samples",
  "tab_dentist_profile",
];

const mapToPlainObject = (maybeMap) => {
  if (!maybeMap) return {};
  if (typeof maybeMap.entries === "function") return Object.fromEntries(maybeMap.entries());
  return maybeMap;
};

const sanitizeRolesArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x || "").trim().toLowerCase())
    .filter((x) => PERMISSION_ROLES.includes(x));
};

export async function ensurePermissionsDoc() {
  let doc = await Permissions.findById(PERMISSIONS_DOC_ID);
  if (!doc) {
    const seed = {};
    OWNER_PERMISSION_KEYS.forEach((k) => (seed[k] = []));
    doc = await Permissions.create({
      _id: PERMISSIONS_DOC_ID,
      permissions: new Map(Object.entries(seed)),
    });
    return doc;
  }

  const current = mapToPlainObject(doc.permissions) || {};
  let changed = false;

  OWNER_PERMISSION_KEYS.forEach((k) => {
    if (!(k in current)) {
      current[k] = [];
      changed = true;
    } else if (Array.isArray(current[k])) {
      const clean = sanitizeRolesArray(current[k]);
      if (JSON.stringify(clean) !== JSON.stringify(current[k])) {
        current[k] = clean;
        changed = true;
      }
    }
  });

  if (changed) {
    doc.permissions = new Map(Object.entries(current));
    await doc.save();
  }

  return doc;
}

// Convert DB array format into FE-friendly { receptionist: boolean, dentist: boolean }
export function toBooleanMatrix(dbPermissions) {
  const raw = mapToPlainObject(dbPermissions) || {};
  const out = {};

  OWNER_PERMISSION_KEYS.forEach((k) => {
    const rolesArr = sanitizeRolesArray(raw[k]);
    out[k] = {
      receptionist: rolesArr.includes("receptionist"),
      dentist: rolesArr.includes("dentist"),
    };
  });

  return out;
}

export async function getAllPermissionsAsMatrix() {
  const doc = await ensurePermissionsDoc();
  return toBooleanMatrix(doc.permissions);
}

export async function userCanAccess(user, permKey) {
  // owners unrestricted (optional safe rule)
  if (!user || !permKey) return true;
  if (user.role === "owner") return true;

  const doc = await ensurePermissionsDoc();
  const raw = mapToPlainObject(doc.permissions) || {};
  const rolesArr = sanitizeRolesArray(raw[permKey]);

  return rolesArr.includes(user.role);
}