import ClinicalMaster from "../../models/ClinicalMaster.model.js";

/**
 * FEE SCHEDULES — the single authority for "what does this treatment cost?".
 *
 * Named price lists (Standard / Corporate / Insurance …) live on the ONE
 * ClinicalMaster config doc, alongside the treatments they price. No parallel
 * pricing engine and no new collection: a schedule is a label plus a set of
 * per-treatment overrides, and it belongs with the catalogue it prices.
 *
 * ── Backward compatibility ────────────────────────────────────────────────
 * The legacy `treatment.fee` IS the default schedule's price. Nothing migrates
 * it, moves it or clears it. Two rules keep every existing price intact:
 *
 *   READ  — getTreatmentFee falls back to `fee` (see precedence below).
 *   WRITE — setTreatmentPrice mirrors a DEFAULT-schedule price back into
 *           `fee`, so any reader that still does a raw `.fee` stays correct.
 */

export const DEFAULT_SCHEDULE_NAME = "Standard";

const money = (v) => Math.max(0, Number(v) || 0);
const clean = (v) => String(v ?? "").trim();

/** Next "FS-#", continuing from the highest existing number. */
function nextScheduleId(list = []) {
  let max = 0;
  for (const row of list || []) {
    const m = /^FS-(\d+)$/.exec(String(row?.id || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `FS-${max + 1}`;
}

/**
 * THE resolver. Every treatment-fee read in the codebase goes through this —
 * a raw `.fee` read anywhere else silently bypasses schedule pricing.
 *
 * Precedence:
 *   1) prices[] has an entry for the requested schedule  → use it.
 *   2) the requested schedule IS the default (or none was asked for)
 *                                                        → legacy `fee`.
 *   3) a non-default schedule with no explicit price     → the DEFAULT
 *      schedule's price, which itself falls back to legacy `fee`.
 *
 * Step 3 is why an unpriced treatment on a new schedule inherits a real price
 * instead of collapsing to 0 — adding a schedule must never zero anything out.
 */
export function getTreatmentFee(treatment, scheduleId, defaultScheduleId) {
  if (!treatment) return 0;

  const legacy = money(treatment.fee);
  const prices = Array.isArray(treatment.prices) ? treatment.prices : [];
  const defId = clean(defaultScheduleId);
  const wanted = clean(scheduleId) || defId;

  // 1 — explicit price for the requested schedule
  const exact = prices.find((p) => clean(p.scheduleId) === wanted);
  if (exact && exact.fee !== undefined && exact.fee !== null) return money(exact.fee);

  // 2 — the requested schedule is the default (or unknown/absent)
  if (!wanted || !defId || wanted === defId) return legacy;

  // 3 — non-default with no override → default's price → legacy fee
  const viaDefault = prices.find((p) => clean(p.scheduleId) === defId);
  if (viaDefault && viaDefault.fee !== undefined && viaDefault.fee !== null) return money(viaDefault.fee);
  return legacy;
}

/** True when the price shown for `scheduleId` is inherited, not set here. */
export function isInheritedPrice(treatment, scheduleId, defaultScheduleId) {
  const prices = Array.isArray(treatment?.prices) ? treatment.prices : [];
  const wanted = clean(scheduleId) || clean(defaultScheduleId);
  if (!wanted) return false;
  // The default schedule is never "inherited" — legacy `fee` is its own price.
  if (wanted === clean(defaultScheduleId)) return false;
  return !prices.some((p) => clean(p.scheduleId) === wanted);
}

export const defaultScheduleIdFrom = (doc) =>
  (doc?.feeSchedules || []).find((s) => s.isDefault)?.id || (doc?.feeSchedules || [])[0]?.id || "";

/**
 * Loads the config doc and guarantees the fee-schedule invariant:
 * at least one schedule exists and EXACTLY one is default.
 *
 * Self-healing in the same never-overwrite spirit as permissionsConfig — it
 * only ever adds the missing "Standard" schedule or repairs a broken default
 * flag. It never touches treatment prices, names, `active` or `notes`.
 */
export async function ensureFeeSchedules() {
  let doc = await ClinicalMaster.findById("CLINICAL-MASTER");
  if (!doc) doc = await ClinicalMaster.create({ _id: "CLINICAL-MASTER" });

  const list = Array.isArray(doc.feeSchedules) ? doc.feeSchedules : [];
  let dirty = false;

  if (list.length === 0) {
    doc.feeSchedules = [{ id: "FS-1", name: DEFAULT_SCHEDULE_NAME, isDefault: true }];
    dirty = true;
  } else {
    const defaults = list.filter((s) => s.isDefault);
    if (defaults.length === 0) {
      // No default at all — promote the first so pricing has an anchor.
      doc.feeSchedules[0].isDefault = true;
      dirty = true;
    } else if (defaults.length > 1) {
      // Two defaults is ambiguous; keep the first, demote the rest.
      let seen = false;
      doc.feeSchedules.forEach((s) => {
        if (!s.isDefault) return;
        if (seen) { s.isDefault = false; dirty = true; }
        seen = true;
      });
    }
  }

  if (dirty) await doc.save();
  return doc;
}

/** [{ id, name, isDefault }] — the default flagged, default first. */
export async function listFeeSchedules() {
  const doc = await ensureFeeSchedules();
  return (doc.feeSchedules || [])
    .map((s) => ({ id: String(s.id), name: String(s.name || ""), isDefault: !!s.isDefault }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function getDefaultScheduleId() {
  return defaultScheduleIdFrom(await ensureFeeSchedules());
}

/** Resolve one treatment's fee by id, for callers that don't hold the doc. */
export async function resolveTreatmentFee(treatmentId, scheduleId) {
  const doc = await ensureFeeSchedules();
  const t = (doc.treatments || []).find((x) => String(x.id) === clean(treatmentId));
  return getTreatmentFee(t, scheduleId, defaultScheduleIdFrom(doc));
}

// ── Owner-only mutations ────────────────────────────────────────────────────
// Callers are already behind auth(["owner"]) at the router mount; these throw
// plain Errors that the clinical-master controllers surface as 400.

export async function createFeeSchedule(name) {
  const n = clean(name);
  if (!n) throw new Error("Schedule name is required");

  const doc = await ensureFeeSchedules();
  if ((doc.feeSchedules || []).some((s) => s.name.toLowerCase() === n.toLowerCase())) {
    throw new Error("A fee schedule with that name already exists");
  }

  // Never default on create — the invariant stays with the existing default.
  const row = { id: nextScheduleId(doc.feeSchedules), name: n, isDefault: false };
  doc.feeSchedules.push(row);
  await doc.save();
  return row;
}

export async function renameFeeSchedule(scheduleId, name) {
  const id = clean(scheduleId);
  const n = clean(name);
  if (!n) throw new Error("Schedule name is required");

  const doc = await ensureFeeSchedules();
  const row = (doc.feeSchedules || []).find((s) => String(s.id) === id);
  if (!row) throw new Error("Fee schedule not found");

  if ((doc.feeSchedules || []).some((s) => String(s.id) !== id && s.name.toLowerCase() === n.toLowerCase())) {
    throw new Error("A fee schedule with that name already exists");
  }

  row.name = n;
  await doc.save();
  return { id: row.id, name: row.name, isDefault: !!row.isDefault };
}

/**
 * Moves the default flag. This is the ONLY way the default changes, so the
 * "exactly one" invariant cannot be broken by a partial write.
 */
export async function setDefaultFeeSchedule(scheduleId) {
  const id = clean(scheduleId);
  const doc = await ensureFeeSchedules();
  const target = (doc.feeSchedules || []).find((s) => String(s.id) === id);
  if (!target) throw new Error("Fee schedule not found");

  doc.feeSchedules.forEach((s) => { s.isDefault = String(s.id) === id; });

  // The legacy `fee` mirror follows the default: whichever schedule is default
  // must be the one `fee` reflects, or raw `.fee` readers would drift.
  const prev = defaultScheduleIdFrom(doc);
  (doc.treatments || []).forEach((t) => {
    const own = (t.prices || []).find((p) => clean(p.scheduleId) === id);
    if (own && own.fee !== undefined && own.fee !== null) t.fee = money(own.fee);
    // No explicit price on the new default → it inherits the old default's
    // price, which `fee` already holds. Nothing to write.
    void prev;
  });

  await doc.save();
  return listFeeSchedules();
}

export async function deleteFeeSchedule(scheduleId) {
  const id = clean(scheduleId);
  const doc = await ensureFeeSchedules();
  const row = (doc.feeSchedules || []).find((s) => String(s.id) === id);
  if (!row) throw new Error("Fee schedule not found");

  // Deleting the default would leave pricing without an anchor.
  if (row.isDefault) {
    throw new Error("Cannot delete the default fee schedule — make another schedule the default first");
  }

  doc.feeSchedules = (doc.feeSchedules || []).filter((s) => String(s.id) !== id);
  // Drop the now-orphaned overrides so they can't resurrect under a reused id.
  (doc.treatments || []).forEach((t) => {
    if (!Array.isArray(t.prices) || !t.prices.length) return;
    t.prices = t.prices.filter((p) => clean(p.scheduleId) !== id);
  });

  await doc.save();
  return { message: "Deleted", id };
}

/**
 * Sets one treatment's price under one schedule.
 *
 * DEFAULT-SYNC: when the target is the default schedule this writes BOTH the
 * prices[] entry and the legacy `fee`, keeping un-migrated readers correct.
 */
export async function setTreatmentPrice(treatmentId, scheduleId, fee) {
  const tid = clean(treatmentId);
  const doc = await ensureFeeSchedules();

  const defId = defaultScheduleIdFrom(doc);
  const sid = clean(scheduleId) || defId;
  if (!(doc.feeSchedules || []).some((s) => String(s.id) === sid)) {
    throw new Error("Fee schedule not found");
  }

  const t = (doc.treatments || []).find((x) => String(x.id) === tid);
  if (!t) throw new Error("Treatment not found");

  const value = money(fee);
  t.prices = Array.isArray(t.prices) ? t.prices : [];
  const existing = t.prices.find((p) => clean(p.scheduleId) === sid);
  if (existing) existing.fee = value;
  else t.prices.push({ scheduleId: sid, fee: value });

  if (sid === defId) t.fee = value; // mirror — see DEFAULT-SYNC above

  await doc.save();
  return {
    id: t.id,
    scheduleId: sid,
    fee: value,
    legacyFee: money(t.fee),
  };
}

/** Removes an override so the treatment inherits again. Default is never cleared. */
export async function clearTreatmentPrice(treatmentId, scheduleId) {
  const tid = clean(treatmentId);
  const doc = await ensureFeeSchedules();
  const defId = defaultScheduleIdFrom(doc);
  const sid = clean(scheduleId);

  if (!sid || sid === defId) {
    throw new Error("The default schedule's price cannot be cleared — set a value instead");
  }

  const t = (doc.treatments || []).find((x) => String(x.id) === tid);
  if (!t) throw new Error("Treatment not found");

  t.prices = (t.prices || []).filter((p) => clean(p.scheduleId) !== sid);
  await doc.save();
  return { id: t.id, scheduleId: sid, fee: getTreatmentFee(t, sid, defId), inherited: true };
}

/**
 * Projects treatments for a schedule: every row carries the RESOLVED fee plus
 * whether that value is inherited. One shared mapper so the owner UI, the
 * dentist catalogue and the billing catalogue cannot drift apart.
 */
export function mapTreatmentsForSchedule(doc, scheduleId) {
  const defId = defaultScheduleIdFrom(doc);
  const sid = clean(scheduleId) || defId;
  return (doc?.treatments || []).map((t) => {
    const plain = t.toObject ? t.toObject() : t;
    return {
      ...plain,
      fee: getTreatmentFee(plain, sid, defId),
      scheduleId: sid,
      inherited: isInheritedPrice(plain, sid, defId),
    };
  });
}
