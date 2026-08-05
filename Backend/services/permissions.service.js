import Permissions from "../models/Permissions.model.js";
import {
  PERMISSION_ROLES,
  OWNER_PERMISSION_KEYS,
  DEFAULT_ROLE_GRANTS,
} from "./shared/permissionsConfig.js";

// Re-export so callers that imported OWNER_PERMISSION_KEYS from this file still work.
export { OWNER_PERMISSION_KEYS };

const PERMISSIONS_DOC_ID = "PERMISSIONS";

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
    // First-ever run: seed every key with DEFAULT_ROLE_GRANTS so fresh installs
    // work without any manual owner action.
    const seed = {};
    OWNER_PERMISSION_KEYS.forEach((k) => (seed[k] = DEFAULT_ROLE_GRANTS[k] ?? []));
    doc = await Permissions.create({
      _id: PERMISSIONS_DOC_ID,
      permissions: new Map(Object.entries(seed)),
    });
    return doc;
  }

  // Existing doc: reconcile on every call.
  const current = mapToPlainObject(doc.permissions) || {};
  let changed = false;

  OWNER_PERMISSION_KEYS.forEach((k) => {
    if (!(k in current)) {
      // Key completely absent — write the default grant.
      current[k] = DEFAULT_ROLE_GRANTS[k] ?? [];
      changed = true;
    } else if (Array.isArray(current[k])) {
      // Key present — only sanitize stale/invalid role strings; never change valid content.
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
  if (!permKey) return true;
  if (!user) return false; // fail closed — no authenticated user, no access
  if (user.role === "owner") return true;

  const doc = await ensurePermissionsDoc();
  const raw = mapToPlainObject(doc.permissions) || {};
  const rolesArr = sanitizeRolesArray(raw[permKey]);

  return rolesArr.includes(user.role);
}
