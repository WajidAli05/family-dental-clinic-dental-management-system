import mongoose from "mongoose";
import { config } from "dotenv";
config();

import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import SampleType from "../models/SampleType.model.js";
import LabCase from "../models/LabCase.model.js";
import LabBill from "../models/LabBill.model.js";

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
} from "./data.js";

const MONGO_URI = process.env.MONGO_URI;

const must = (val, msg) => {
  if (!val) throw new Error(msg);
  return val;
};

const makeName = () =>
  `${pick(firstNames)} ${pick(lastNames)}`;

async function seedUsers() {
  const dentists = Array.from({ length: 5 }).map((_, i) => ({
    publicId: `DENT-${i + 1}`,
    name: `Dr. ${makeName()}`,
    email: `dentist${i + 1}@fdc.com`,
    phone: `03${randInt(0, 9)}${randInt(10000000, 99999999)}`,
    role: "dentist",
    enabled: true,
    specialization: pick(["Orthodontics", "Endodontics", "Prosthodontics"]),
    commissionPercent: randInt(10, 40),
  }));

  const staff = [
    {
      publicId: "OWNER-1",
      name: "Clinic Owner",
      email: "owner@fdc.com",
      phone: "0300-0000000",
      role: "owner",
      enabled: true,
    },
    {
      publicId: "REC-1",
      name: "Reception User",
      email: "receptionist@fdc.com",
      phone: "0301-1111111",
      role: "receptionist",
      enabled: true,
    },
  ];

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
  }));

  const all = [...staff, ...dentists, ...labs];

  const created = await User.insertMany(all);
  return created;
}

async function seedSampleTypes() {
  const docs = sampleTypeNames.map((x, i) => ({
    publicId: `ST-${i + 1}`,
    name: x.name,
    description: x.desc,
    active: true,
  }));

  return SampleType.insertMany(docs);
}

async function seedPatients(dentists) {
  const patients = Array.from({ length: 10 }).map((_, i) => ({
    publicId: makePublicId("PT", i + 1),
    mr: i + 1,
    name: makeName(),
    phone: `03${randInt(0, 9)}${randInt(10000000, 99999999)}`,
    age: randInt(15, 70),
    gender: pick(["Male", "Female"]),
    city: pick(cities),
    address: `${randInt(1, 200)} Street ${randInt(1, 20)}, ${pick(cities)}`,
    status: pick(["active", "active", "inactive"]),
    registrationDate: randDateISO(180),
    lastVisit: randDateISO(30),
    primaryDentist: pick(dentists)?._id,
    tags: pick([
      ["diabetic"],
      ["ortho"],
      ["prosthetic"],
      [],
    ]),
  }));

  return Patient.insertMany(patients);
}

async function seedLabCases({ labs, dentists, patients, sampleTypes }) {
  const statuses = [
    "sent",
    "in-process",
    "ready",
    "delivered",
    "approved",
    "rejected",
  ];

  const cases = Array.from({ length: 10 }).map((_, i) => {
    const lab = pick(labs);
    const dentist = pick(dentists);
    const patient = pick(patients);
    const st = pick(sampleTypes);

    const teethCount = randInt(1, 3);
    const teeth = Array.from({ length: teethCount }).map(() =>
      String(randInt(11, 48))
    );

    const status = pick(statuses);
    const note = pick([
      "",
      "Shade A2",
      "Urgent case",
      "Need better impression",
      "Check occlusion",
      "Add glaze",
    ]);

    return {
      publicId: `CASE-${2000 + i + 1}`,
      patient: patient._id,
      dentist: dentist._id,
      lab: lab._id,
      sampleType: st._id,
      status,
      note,
      teeth,
      timeline: [
        {
          at: new Date(),
          status: "sent",
          note: "Case assigned",
        },
      ],
    };
  });

  return LabCase.insertMany(cases);
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
  ]);
  console.log("🧹 Cleared collections");

  const users = await seedUsers();
  const sampleTypes = await seedSampleTypes();

  const labs = users.filter((u) => u.role === "lab");
  const dentists = users.filter((u) => u.role === "dentist");

  const patients = await seedPatients(dentists);

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