import SampleType from "../../models/SampleType.model.js";
import { parsePagination, paginateArray } from "./paginate.js";
import { ensureFeeSchedules, defaultScheduleIdFrom, getTreatmentFee } from "./feeSchedules.js";

/**
 * The priced treatment catalogue — the chokepoint every billing path reaches
 * a treatment price through (invoice line items snapshot `fee` from here).
 *
 * `scheduleId` omitted => the default schedule, which resolves to the legacy
 * `fee`, so behaviour is identical to before fee schedules existed.
 */
export async function getActiveTreatments({ page, limit, scheduleId } = {}) {
  const { page: P, limit: L } = parsePagination({ page, limit });
  const doc = await ensureFeeSchedules();
  const defaultScheduleId = defaultScheduleIdFrom(doc);
  const effectiveScheduleId = scheduleId || defaultScheduleId;

  const all = (doc?.treatments || [])
    .filter((t) => t.active !== false)
    .map((t) => ({
      id: String(t.id || ""),
      name: String(t.name || ""),
      code: String(t.code || ""),
      // NEVER read t.fee directly — the resolver owns pricing.
      fee: getTreatmentFee(t, effectiveScheduleId, defaultScheduleId),
      scheduleId: effectiveScheduleId,
    }));
  return paginateArray(all, P, L);
}

export async function getActiveSampleTypes({ page, limit } = {}) {
  const { page: P, limit: L } = parsePagination({ page, limit });
  const docs = await SampleType.find({ active: { $ne: false } })
    .select("publicId name price")
    .sort({ name: 1 })
    .lean();
  const rows = docs.map((s) => ({
    id: String(s.publicId || ""),
    name: String(s.name || ""),
    price: Number(s.price) || 0,
  }));
  return paginateArray(rows, P, L);
}
