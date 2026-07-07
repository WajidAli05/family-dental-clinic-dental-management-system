// Single source of truth for permission keys and default role grants.
// Both permissions.service.js and owner.service.js import from here so they
// can never silently diverge again.

export const PERMISSION_ROLES = ["receptionist", "dentist"];

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
  "tab_dentist_patients",
  "tab_dentist_profile",
  "tab_dentist_finance",
];

// Default role grants applied when a key is FIRST written to the DB (missing key only).
// Never overwrites a key that already has a non-empty value in the DB.
// Owner can still revoke/change any key via the permissions UI after initial seeding.
export const DEFAULT_ROLE_GRANTS = {
  tab_receptionist_dashboard:    ["receptionist"],
  tab_receptionist_patients:     ["receptionist"],
  tab_receptionist_appointments: ["receptionist"],
  tab_receptionist_lab_samples:  ["receptionist"],
  tab_receptionist_billing:      ["receptionist"],
  tab_receptionist_inventory:    ["receptionist"],
  tab_receptionist_profile:      ["receptionist"],

  tab_dentist_dashboard:         ["dentist"],
  tab_dentist_appointments:      ["dentist"],
  tab_dentist_lab_samples:       ["dentist"],
  tab_dentist_patients:          ["dentist"],
  tab_dentist_profile:           ["dentist"],
  tab_dentist_finance:           ["dentist"],
};
