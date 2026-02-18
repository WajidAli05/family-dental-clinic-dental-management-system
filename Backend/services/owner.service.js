import User from "../models/User.model.js";
import Appointment from "../models/Appointment.model.js";

const normalize = (v) => String(v || "").trim();
const lower = (v) => normalize(v).toLowerCase();

export async function ownerListAppointments(_ownerId, { dateFrom, dateTo, dentistId, status, q } = {}) {
  const filter = {};

  // Date range on YYYY-MM-DD strings (works lexicographically)
  if (dateFrom && dateTo) filter.date = { $gte: normalize(dateFrom), $lte: normalize(dateTo) };
  else if (dateFrom) filter.date = { $gte: normalize(dateFrom) };
  else if (dateTo) filter.date = { $lte: normalize(dateTo) };

  // Status
  if (status && status !== "all") {
    const st = lower(status);
    const allowed = ["scheduled", "checked_in", "completed", "cancelled", "no_show"];
    if (allowed.includes(st)) filter.status = st;
  }

  // Dentist (publicId -> ObjectId)
  if (dentistId && dentistId !== "all") {
    const d = await User.findOne({ role: "dentist", publicId: normalize(dentistId) }).select("_id");
    if (!d) return []; // invalid dentist => empty results
    filter.dentist = d._id;
  }

  const rows = await Appointment.find(filter)
    .populate("patient", "name phone publicId mr")
    .populate("dentist", "name publicId")
    .sort({ date: 1, time: 1 })
    .lean();

  let mapped = rows.map((a) => ({
    id: a.publicId,
    date: a.date,
    time: a.time,

    patientName: a.patient?.name || "",
    patientPhone: a.patient?.phone || "",

    dentistId: a.dentist?.publicId || "",
    dentistName: a.dentist?.name || "",

    status: a.status,
    reason: a.reason || "",
    notes: a.notes || "",
  }));

  // Search (q)
  const needle = lower(q);
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.patientPhone} ${x.dentistName} ${x.reason} ${x.status} ${x.date} ${x.time}`
        .toLowerCase()
        .includes(needle)
    );
  }

  return mapped;
}