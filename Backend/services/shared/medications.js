import Medication from "../../models/Medication.model.js";
import { parsePagination } from "./paginate.js";

async function nextPublicId() {
  const last = await Medication.findOne({ publicId: { $regex: /^MED-\d+$/ } })
    .select("publicId")
    .sort({ createdAt: -1 })
    .lean();
  let n = 1;
  if (last?.publicId) {
    const m = String(last.publicId).match(/^MED-(\d+)$/);
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }
  return `MED-${n}`;
}

function toRow(doc) {
  return {
    id:          doc.publicId || doc.id || String(doc._id || ""),
    name:        doc.name || "",
    genericName: doc.genericName || "",
    form:        doc.form || "tablet",
    strength:    doc.strength || "",
    active:      doc.active !== false,
  };
}

export async function searchMedications(q, limit = 10) {
  const lm = Math.min(50, Number(limit) || 10);
  const needle = String(q || "").trim();
  const filter = { active: true };
  if (needle) {
    filter.$or = [
      { nameLower:    { $regex: needle.toLowerCase(), $options: "i" } },
      { genericName:  { $regex: needle, $options: "i" } },
    ];
  }
  const rows = await Medication.find(filter).sort({ nameLower: 1 }).limit(lm).lean();
  return rows.map(toRow);
}

export async function createOrGetMedication(body = {}, user = {}) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("name is required");

  const nameLower = name.toLowerCase();
  const existing = await Medication.findOne({ nameLower }).lean();
  if (existing) return toRow(existing);

  const publicId = await nextPublicId();
  const doc = new Medication({
    publicId,
    name,
    nameLower,
    genericName: String(body.genericName || ""),
    form:        body.form || "tablet",
    strength:    String(body.strength || ""),
    active:      true,
    addedBy: {
      role:   user.role   || "",
      userId: user.publicId || String(user._id || ""),
    },
  });
  await doc.save();
  return toRow(doc.toJSON());
}

export async function listMedications({ page, limit, q, active } = {}) {
  const { page: P, limit: L, skip } = parsePagination({ page, limit });
  const filter = { active: active === "false" ? false : true };
  if (q && String(q).trim()) {
    const needle = String(q).trim();
    filter.$or = [
      { nameLower:   { $regex: needle.toLowerCase(), $options: "i" } },
      { genericName: { $regex: needle, $options: "i" } },
    ];
  }
  const [total, rows] = await Promise.all([
    Medication.countDocuments(filter),
    Medication.find(filter).sort({ nameLower: 1 }).skip(skip).limit(L).lean(),
  ]);
  return {
    rows:  rows.map(toRow),
    total,
    page:  P,
    pages: Math.max(1, Math.ceil(total / L)),
  };
}
