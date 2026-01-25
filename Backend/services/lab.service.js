import User from "../models/User.model.js";
import LabCase from "../models/LabCase.model.js";

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj?.[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

const allowedStatuses = ["sent", "in-process", "ready", "delivered", "approved", "rejected"];

const formatTooth = (teeth = []) => teeth.map((t) => `#${t}`).join(", ");

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

const mapCaseToFrontend = (c) => ({
  id: c.publicId,
  type: c.sampleType?.name || "",
  tooth: formatTooth(c.teeth || []),
  date: formatDate(c.createdAt),
  status: c.status, // ✅ now matches UI
  note: c.note || "",
});

export async function labGetMe(publicId) {
  const user = await User.findOne({ publicId, role: "lab" }).lean();

  if (!user) {
    const created = await User.create({
      publicId,
      name: "Lab User",
      email: "lab@example.com",
      role: "lab",
      enabled: true,
    });
    return created.toJSON();
  }

  return user;
}

export async function labUpdateMe(publicId, body) {
  const allowed = pick(body, [
    "name",
    "email",
    "phone",
    "address",
    "specialization",
    "experience",
    "bio",
    "certifications",
    "workingHours",
    "joinDate",
  ]);

  const updated = await User.findOneAndUpdate(
    { publicId, role: "lab" },
    { $set: allowed },
    { new: true, upsert: true }
  );

  return updated.toJSON();
}

export async function labGetStats(publicId) {
  const labUser = await User.findOne({ publicId, role: "lab" }).select("_id").lean();
  if (!labUser) return { total: 0, inProcess: 0, ready: 0, recent: 0 };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, inProcess, ready, recent] = await Promise.all([
    LabCase.countDocuments({ lab: labUser._id }),
    LabCase.countDocuments({ lab: labUser._id, status: "in-process" }), // ✅ fixed
    LabCase.countDocuments({ lab: labUser._id, status: "ready" }),
    LabCase.countDocuments({ lab: labUser._id, updatedAt: { $gte: sevenDaysAgo } }), // ✅ "recently updated" matches UI
  ]);

  return { total, inProcess, ready, recent };
}

export async function labGetCases(publicId, filters) {
  const labUser = await User.findOne({ publicId, role: "lab" }).select("_id").lean();
  if (!labUser) return [];

  const query = { lab: labUser._id };

  if (filters.status && filters.status !== "all") {
    if (!allowedStatuses.includes(filters.status)) return [];
    query.status = filters.status;
  }

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }

  const q = String(filters.q || "").trim().toLowerCase();

  const rows = await LabCase.find(query)
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .lean();

  const mapped = rows.map(mapCaseToFrontend);

  if (!q) return mapped;

  return mapped.filter((x) => {
    const hay = `${x.id} ${x.type} ${x.tooth} ${x.status} ${x.note}`.toLowerCase();
    return hay.includes(q);
  });
}

export async function labUpdateCaseStatus(publicId, casePublicId, { status, note }) {
  const labUser = await User.findOne({ publicId, role: "lab" }).select("_id").lean();
  if (!labUser) throw new Error("Lab not found");

  const c = await LabCase.findOne({ publicId: casePublicId, lab: labUser._id }).populate("sampleType", "name");
  if (!c) throw new Error("Case not found");

  if (status) {
    if (!allowedStatuses.includes(status)) throw new Error("Invalid status");
    c.status = status;
  }

  if (note !== undefined) c.note = note;

  c.timeline.push({
    at: new Date(),
    status: c.status,
    note: note || "",
  });

  await c.save();

  // ✅ return frontend shape always
  return mapCaseToFrontend(c);
}

export async function labUpdateCaseNote(publicId, casePublicId, note) {
  return labUpdateCaseStatus(publicId, casePublicId, { status: undefined, note });
}