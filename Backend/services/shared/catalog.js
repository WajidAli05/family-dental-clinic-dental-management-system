import ClinicalMaster from "../../models/ClinicalMaster.model.js";
import SampleType from "../../models/SampleType.model.js";
import { parsePagination, paginateArray } from "./paginate.js";

export async function getActiveTreatments({ page, limit } = {}) {
  const { page: P, limit: L } = parsePagination({ page, limit });
  const doc = await ClinicalMaster.findById("CLINICAL-MASTER").lean();
  const all = (doc?.treatments || [])
    .filter((t) => t.active !== false)
    .map((t) => ({
      id: String(t.id || ""),
      name: String(t.name || ""),
      code: String(t.code || ""),
      fee: Number(t.fee) || 0,
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
