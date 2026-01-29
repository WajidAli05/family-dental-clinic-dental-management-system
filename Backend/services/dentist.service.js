import User from "../models/User.model.js";
import Appointment from "../models/Appointment.model.js";
import LabCase from "../models/LabCase.model.js";
import Prescription from "../models/Prescription.model.js";

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj?.[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

const todayISO = () => new Date().toISOString().slice(0, 10);

export async function dentistGetMe(dentistId) {
  const user = await User.findById(dentistId).lean();
  if (!user) throw new Error("Dentist not found");
  return user;
}

export async function dentistUpdateMe(dentistId, body) {
  const allowed = pick(body, [
    "name",
    "email",
    "phone",
    "specialization",
    "available",
    "commissionPercent",
  ]);

  const updated = await User.findByIdAndUpdate(
    dentistId,
    { $set: allowed },
    { new: true }
  );

  if (!updated) throw new Error("Dentist not found");
  return updated.toJSON();
}

export async function dentistChangePassword(dentistId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) throw new Error("currentPassword and newPassword are required");

  const user = await User.findById(dentistId).select("+passwordHash");
  if (!user) throw new Error("Dentist not found");

  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw new Error("Current password is incorrect");

  await user.setPassword(newPassword);
  user.forcePasswordChange = false;
  await user.save();

  return { message: "Password updated" };
}

export async function dentistGetStats(dentistId) {
  const date = todayISO();

  const [appointmentsToday, completedToday, pendingLab, prescriptionsToday] = await Promise.all([
    Appointment.countDocuments({ dentist: dentistId, date }),
    Appointment.countDocuments({ dentist: dentistId, date, status: "completed" }),
    LabCase.countDocuments({
      dentist: dentistId,
      status: { $in: ["sent", "in_progress", "ready", "delivered"] }, // pending decision
    }),
    Prescription.countDocuments({ date, dentistName: { $exists: true, $ne: "" } }), // simple for now
  ]);

  return {
    appointmentsToday,
    patientsSeen: completedToday,
    pendingLab,
    prescriptionsToday,
  };
}

export async function dentistGetAppointments(dentistId, { date } = {}) {
  const d = date || todayISO();

  const rows = await Appointment.find({ dentist: dentistId, date: d })
    .populate("patient", "name publicId mr")
    .sort({ time: 1 })
    .lean();

  // ✅ keep frontend-friendly shape (matches your existing UI fields)
  return rows.map((a) => ({
    id: a.publicId,          // your UI uses id
    mr: a.patient?.mr || null,
    patientName: a.patient?.name || "",
    dentistName: "",         // optional
    date: a.date,
    time: a.time,
    reason: a.reason,
    status: a.status,        // scheduled/completed...
    original: a,
  }));
}

export async function dentistGetCases(dentistId, { status, q } = {}) {
  const query = { dentist: dentistId };

  if (status && status !== "all") query.status = String(status);

const rows = await LabCase.find(query)
  .populate("patient", "name publicId phone")
  .populate("dentist", "name publicId")
  .populate("lab", "name publicId")           // ✅ ADD THIS
  .populate("sampleType", "name publicId")
  .sort({ createdAt: -1 })
  .lean();

const mapped = rows.map((c) => ({
  id: c.publicId,

  // dentist table expects these:
  patientName: c.patient?.name || "",
  lab: c.lab?.name || "",
  sentDate: c.createdAtISO || new Date(c.createdAt).toISOString().slice(0, 10),

  // ✅ IMPORTANT: provide teeth array for join()
  teeth: Array.isArray(c.teeth) ? c.teeth : [],

  // keep existing fields too (used elsewhere)
  type: c.sampleType?.name || "",
  tooth: (c.teeth || []).map((t) => `#${t}`).join(", "),
  date: new Date(c.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }),

  status: c.status, // sent | in_progress | ready | delivered | approved | rejected
  note: c.notes || "",
  dentistName: c.dentist?.name || "",
}));

  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return mapped;

  return mapped.filter((x) =>
    `${x.id} ${x.type} ${x.tooth} ${x.status} ${x.note} ${x.patientName}`
      .toLowerCase()
      .includes(needle)
  );
}

export async function dentistApproveCase(dentistId, casePublicId) {
  const c = await LabCase.findOne({ publicId: casePublicId, dentist: dentistId });
  if (!c) throw new Error("Case not found");

  c.status = "approved";
  c.timeline.push({
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    status: "approved",
    note: "Approved by dentist",
  });

  await c.save();
  return c.toJSON();
}