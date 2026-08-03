const ROLE_LABELS = {
  owner:        "Owner",
  receptionist: "Receptionist",
  dentist:      "Dentist",
  lab:          "Lab",
  system:       "System",
  unknown:      "Unknown",
};

const ACTION_TEMPLATES = {
  "patient.create":            ({ actorName, entityLabel }) =>
    `${actorName} registered new patient${entityLabel ? ` "${entityLabel}"` : ""}`,

  "patient.update":            ({ actorName, entityLabel }) =>
    `${actorName} updated patient${entityLabel ? ` "${entityLabel}"` : ""}`,

  "patient.delete":            ({ actorName, entityLabel }) =>
    `${actorName} deleted patient${entityLabel ? ` "${entityLabel}"` : ""}`,

  "appointment.create":        ({ actorName, entityLabel }) =>
    `${actorName} created appointment${entityLabel ? ` ${entityLabel}` : ""}`,

  "appointment.update":        ({ actorName, entityLabel }) =>
    `${actorName} updated appointment${entityLabel ? ` ${entityLabel}` : ""}`,

  "appointment.status_change": ({ actorName, entityLabel, after }) =>
    `${actorName} changed appointment ${entityLabel || ""} status${after?.status ? ` to "${after.status}"` : ""}`,

  "appointment.assign":        ({ actorName, entityLabel }) =>
    `${actorName} assigned appointment${entityLabel ? ` ${entityLabel}` : ""}`,

  "appointment.cancel":        ({ actorName, entityLabel }) =>
    `${actorName} cancelled appointment${entityLabel ? ` ${entityLabel}` : ""}`,

  "appointment.delete":        ({ actorName, entityLabel }) =>
    `${actorName} deleted appointment${entityLabel ? ` ${entityLabel}` : ""}`,

  "invoice.create":            ({ actorName, entityLabel }) =>
    `${actorName} created invoice${entityLabel ? ` ${entityLabel}` : ""}`,

  "invoice.payment":           ({ actorName, entityLabel, after }) =>
    `${actorName} recorded payment on invoice ${entityLabel || ""}${after?.amount ? ` — ${after.amount}` : ""}`,

  "invoice.update":            ({ actorName, entityLabel }) =>
    `${actorName} updated invoice${entityLabel ? ` ${entityLabel}` : ""}`,

  "labcase.create":            ({ actorName, entityLabel }) =>
    `${actorName} created lab case${entityLabel ? ` ${entityLabel}` : ""}`,

  "labcase.status_change":     ({ actorName, entityLabel, after }) =>
    `${actorName} updated lab case ${entityLabel || ""} status${after?.status ? ` to "${after.status}"` : ""}`,

  "labcase.update":            ({ actorName, entityLabel }) =>
    `${actorName} updated lab case${entityLabel ? ` ${entityLabel}` : ""}`,

  "labcase.delete":            ({ actorName, entityLabel }) =>
    `${actorName} deleted lab case${entityLabel ? ` ${entityLabel}` : ""}`,

  "prescription.create":       ({ actorName, entityLabel }) =>
    `${actorName} created prescription${entityLabel ? ` for patient ${entityLabel}` : ""}`,

  "prescription.update":       ({ actorName, entityLabel }) =>
    `${actorName} updated prescription${entityLabel ? ` for patient ${entityLabel}` : ""}`,

  "permission.change":         ({ actorName }) =>
    `${actorName} changed staff permissions`,

  "config.update":             ({ actorName, entityLabel, after }) => {
    const detail = after && Object.keys(after).length
      ? ` (${Object.entries(after).map(([k, v]) => `${k}: ${v}`).join(", ")})`
      : "";
    return `${actorName} updated clinic ${entityLabel || "configuration"}${detail}`;
  },

  "settings.update":           ({ actorName }) =>
    `${actorName} updated clinic settings`,

  "user.login":                ({ actorName, actorRole }) =>
    `${ROLE_LABELS[actorRole] || actorRole} ${actorName} logged in`,

  "user.logout":               ({ actorName, actorRole }) =>
    `${ROLE_LABELS[actorRole] || actorRole} ${actorName} logged out`,

  "user.2fa_setup":            ({ actorName, after }) =>
    `${actorName} started 2FA setup${after?.method ? ` (${after.method.toUpperCase()})` : ""}`,

  "user.2fa_enabled":          ({ actorName, after }) =>
    `${actorName} enabled two-factor authentication${after?.method ? ` (${after.method.toUpperCase()})` : ""}`,

  "user.2fa_disabled":         ({ actorName }) =>
    `${actorName} disabled two-factor authentication`,

  "auth.2fa_verified":         ({ actorName, after }) =>
    `2FA verified for ${actorName}${after?.codeType === "backup" ? " using a backup code" : ""}`,

  "auth.2fa_failed":           ({ actorName, after }) =>
    `Failed 2FA attempt for ${actorName}${after?.step ? ` (step: ${after.step})` : ""}`,

  "auth.login_failed":         ({ entityLabel }) =>
    `Failed login attempt for ${entityLabel || "unknown account"}`,

  "auth.lockout":              ({ entityLabel }) =>
    `Account locked: ${entityLabel || "unknown"}`,

  "session.revoke_all":        ({ actorName }) =>
    `${actorName} revoked all active sessions`,

  "audit.view":                ({ actorName, actorRole }) =>
    `${ROLE_LABELS[actorRole] || actorRole} ${actorName} viewed audit logs`,
};

export function describeAuditEntry(entry) {
  const fn = ACTION_TEMPLATES[entry?.action];
  if (!fn) {
    return [
      entry?.actorName || "Unknown",
      "performed",
      entry?.action || "unknown action",
      entry?.entityType ? `on ${entry.entityType}` : "",
      entry?.entityLabel ? `"${entry.entityLabel}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  try {
    return fn(entry);
  } catch {
    return `${entry?.actorName || "Unknown"} performed ${entry?.action || "unknown action"}`;
  }
}
