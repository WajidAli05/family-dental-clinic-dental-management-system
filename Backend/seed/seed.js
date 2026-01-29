import mongoose from "mongoose";
import { config } from "dotenv";
config();

import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import SampleType from "../models/SampleType.model.js";
import LabCase from "../models/LabCase.model.js";
import LabBill from "../models/LabBill.model.js";
import Appointment from "../models/Appointment.model.js";

import {
  uid,
  pick,
  randInt,
  randDateISO,
  randMonthISO,
  makePublicId,
} from "./helpers.js";

import {
  cities,
  firstNames,
  lastNames,
  sampleTypeNames,
  labProfiles,
  appointmentReasons,
  appointmentTimes,
  dentistProfiles,
  ownerProfiles,
  receptionistProfiles,
} from "./data.js";

const MONGO_URI = process.env.MONGO_URI;

const must = (val, msg) => {
  if (!val) throw new Error(msg);
  return val;
};

const makeName = () => `${pick(firstNames)} ${pick(lastNames)}`;

const nowAtString = () =>
  new Date().toISOString().slice(0, 16).replace("T", " "); // "YYYY-MM-DD HH:mm"

async function seedUsers() {
  // ---- staff (with passwords) ----
  const staff = [
    {
      publicId: "OWNER-1",
      name: "Clinic Owner",
      email: "owner@fdc.com",
      phone: "0300-0000000",
      role: "owner",
      enabled: true,
      password: "owner123",
    },
    {
      publicId: "REC-1",
      name: "Reception User",
      email: "receptionist@fdc.com",
      phone: "0301-1111111",
      role: "receptionist",
      enabled: true,
      password: "reception123",
    },
  ];

  // ---- dentists (with passwords) ----
  const dentists = Array.from({ length: 10 }).map((_, i) => ({
    publicId: `DENT-${i + 1}`,
    name: `Dr. ${makeName()}`,
    email: `dentist${i + 1}@fdc.com`,
    phone: `03${randInt(0, 9)}${randInt(10000000, 99999999)}`,
    role: "dentist",
    enabled: true,
    specialization: pick(["Orthodontics", "Endodontics", "Prosthodontics"]),
    commissionPercent: randInt(10, 40),
    password: "dentist123",
  }));

  // ---- labs (with passwords from data.js) ----
  const labs = labProfiles.map((l) => ({
    publicId: l.publicId,
    name: l.name,
    email: l.email,
    phone: l.phone,
    address: l.address,
    specialization: l.specialization,
    experience: l.experience,
    bio: l.bio,
    certifications: l.certifications,
    workingHours: l.workingHours,
    joinDate: l.joinDate,
    role: "lab",
    enabled: true,
    forcePasswordChange: true,
    password: l.password || "lab123",
  }));

  const all = [...staff, ...dentists, ...labs];

  // ✅ IMPORTANT: must hash passwords (insertMany alone won't call setPassword)
  const docs = [];
  for (const u of all) {
    const { password, ...rest } = u;
    const doc = new User(rest);
    await doc.setPassword(password);
    docs.push(doc);
  }

  const created = await User.insertMany(docs);
  return created;
}

async function seedSampleTypes() {
  const docs = sampleTypeNames.map((x, i) => ({
    publicId: `ST-${i + 1}`,
    name: x.name,
    description: x.desc,
    active: true,
  }));

  // ensure at least 10
  while (docs.length < 10) {
    const i = docs.length + 1;
    docs.push({
      publicId: `ST-${i}`,
      name: `Sample Type ${i}`,
      description: "Auto generated",
      active: true,
    });
  }

  return SampleType.insertMany(docs);
}

async function seedPatients(dentists) {
  const patients = Array.from({ length: 10 }).map((_, i) => ({
    publicId: makePublicId("PT", i + 1),
    mr: i + 1,
    name: makeName(),
    phone: `03${randInt(0, 9)}${randInt(10000000, 99999999)}`,
    age: randInt(15, 70),
    gender: pick(["Male", "Female", "Other"]),
    city: pick(cities),
    address: `${randInt(1, 200)} Street ${randInt(1, 20)}, ${pick(cities)}`,
    status: pick(["active", "active", "inactive"]),
    registrationDate: randDateISO(180),
    lastVisit: randDateISO(30),
    primaryDentist: pick(dentists)?._id,
    tags: pick([["diabetic"], ["ortho"], ["prosthetic"], []]),
  }));

  return Patient.insertMany(patients);
}

async function seedLabCases({ labs, dentists, patients, sampleTypes }) {
  // ✅ These must match your LabCase schema enum EXACTLY
  const statuses = ["received", "in-process", "ready", "delivered", "approved", "rejected"];

  // ✅ dentist1@fdc.com is DENT-1 -> dentists[0] in your seedUsers()
  const dentist1 = dentists[0];

  // ✅ Create cases for dentist1 with ALL statuses (repeat them)
  const totalForDentist1 = 18; // adjust if you want more
  const dentist1Cases = Array.from({ length: totalForDentist1 }).map((_, i) => {
    const lab = pick(labs);
    const patient = pick(patients);
    const st = pick(sampleTypes);

    const teethCount = randInt(1, 3);
    const teeth = Array.from({ length: teethCount }).map(() => String(randInt(11, 48)));

    const status = statuses[i % statuses.length]; // ✅ cycles through all statuses
    const notes = pick([
      "",
      "Shade A2",
      "Urgent case",
      "Need better impression",
      "Check occlusion",
      "Add glaze",
    ]);

    return {
      publicId: `CASE-${3000 + i + 1}`,
      createdAtISO: randDateISO(30),
      patient: patient._id,
      dentist: dentist1._id, // ✅ FORCE dentist1
      lab: lab._id,
      sampleType: st._id,
      status,
      notes,
      teeth,
      timeline: [
        {
          at: nowAtString(),
          status: "received",
          note: "Case assigned",
        },
        // optional: add another timeline entry matching current status
        ...(status !== "received"
          ? [
              {
                at: nowAtString(),
                status,
                note: `Moved to ${status}`,
              },
            ]
          : []),
      ],
    };
  });

  // ✅ Also keep some random cases for realism (optional)
  const otherCases = Array.from({ length: 12 }).map((_, i) => {
    const lab = pick(labs);
    const dentist = pick(dentists);
    const patient = pick(patients);
    const st = pick(sampleTypes);

    const teethCount = randInt(1, 3);
    const teeth = Array.from({ length: teethCount }).map(() => String(randInt(11, 48)));

    const status = pick(statuses);
    const notes = pick(["", "Shade B1", "Retry impression", "QC passed"]);

    return {
      publicId: `CASE-${4000 + i + 1}`,
      createdAtISO: randDateISO(30),
      patient: patient._id,
      dentist: dentist._id,
      lab: lab._id,
      sampleType: st._id,
      status,
      notes,
      teeth,
      timeline: [
        {
          at: nowAtString(),
          status: "received",
          note: "Case assigned",
        },
      ],
    };
  });

  return LabCase.insertMany([...dentist1Cases, ...otherCases]);
}

async function seedLabBills({ labs }) {
  const bills = Array.from({ length: 10 }).map(() => {
    const lab = pick(labs);
    return {
      _id: uid(),
      month: randMonthISO(6),
      labId: lab.publicId,
      labName: lab.name,
      amount: randInt(15000, 50000),
    };
  });

  return LabBill.insertMany(bills);
}

const todayISO = () => new Date().toISOString().slice(0, 10);

async function seedAppointments({ dentists, patients }) {
  const today = todayISO();

  // pick first dentist to guarantee TODAY has appointments (for dashboard)
  const dentist1 = dentists[0];

  // make sure we have enough unique patients for today
  const todaysPatients = patients.slice(0, 6);

  const todays = todaysPatients.map((p, idx) => ({
    publicId: `APT-${1001 + idx}`,
    patient: p._id,
    dentist: dentist1._id,
    date: today,
    time: appointmentTimes[idx % appointmentTimes.length],
    reason: pick(appointmentReasons),
    notes: pick(["", "Patient requested early slot", "Sensitive tooth noted"]),
    status: "scheduled",
  }));

  // add extra mixed appointments (past/future) for realism
  const more = Array.from({ length: 14 }).map((_, i) => {
    const dentist = pick(dentists);
    const patient = pick(patients);

    // spread around last 7 days and next 7 days
    const offsetDays = randInt(-7, 7);
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const date = d.toISOString().slice(0, 10);

    const status = pick(["scheduled", "scheduled", "completed", "cancelled"]);

    return {
      publicId: `APT-${2001 + i}`,
      patient: patient._id,
      dentist: dentist._id,
      date,
      time: pick(appointmentTimes),
      reason: pick(appointmentReasons),
      notes: pick(["", "Follow-up needed", "X-ray requested", "Pain complaint"]),
      status,
    };
  });

  return Appointment.insertMany([...todays, ...more]);
}

async function main() {
  must(MONGO_URI, "❌ MONGO_URI missing in .env");

  await mongoose.connect(MONGO_URI);
  console.log("✅ DB connected");

  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    SampleType.deleteMany({}),
    LabCase.deleteMany({}),
    LabBill.deleteMany({}),
    Appointment.deleteMany({}),
  ]);
  console.log("🧹 Cleared collections");

  const users = await seedUsers();
  const sampleTypes = await seedSampleTypes();

  const labs = users.filter((u) => u.role === "lab");
  const dentists = users.filter((u) => u.role === "dentist");

  const patients = await seedPatients(dentists);
  await seedAppointments({ dentists, patients });

  await seedLabCases({ labs, dentists, patients, sampleTypes });
  await seedLabBills({ labs });

  console.log("✅ Seeding complete");
  await mongoose.disconnect();
  console.log("✅ DB disconnected");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});