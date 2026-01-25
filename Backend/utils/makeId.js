import crypto from "crypto";

export default function makeId(prefix) {
  // Example: APT-1f3a...  (safe + unique)
  return `${prefix}-${crypto.randomUUID()}`;
}