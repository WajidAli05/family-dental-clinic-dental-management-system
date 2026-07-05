/**
 * seedExtraPatients.js
 * Inserts 110 additional patient records — additive, non-destructive.
 * Does NOT deleteMany or touch any other collection.
 * Idempotent: computes starting publicId/mr from current DB max.
 *
 * Usage: node Backend/seed/seedExtraPatients.js
 */
import mongoose from "mongoose";
import { config } from "dotenv";
config();

import Patient from "../models/Patient.model.js";
import { pick, randInt, randDateISO } from "./helpers.js";
import { cities, firstNames, lastNames } from "./data.js";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set in .env");
  process.exit(1);
}

const EXTRA_COUNT = 110;

const phones = () => {
  const prefixes = ["0300", "0301", "0302", "0303", "0311", "0312", "0313", "0321", "0333", "0345"];
  return `${pick(prefixes)}-${randInt(1000000, 9999999)}`;
};

const randomGender = () => (Math.random() < 0.5 ? "Male" : "Female");

const randomStatus = () => (Math.random() < 0.8 ? "active" : "inactive");

const randomEmail = (name, n) => {
  const safe = name.toLowerCase().replace(/\s+/g, ".");
  return `${safe}.${n}@example.com`;
};

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Compute current max publicId (PT-NNNN) and mr
  const lastByPublicId = await Patient.findOne({}, { publicId: 1 })
    .sort({ publicId: -1 })
    .lean();

  const lastByMr = await Patient.findOne({}, { mr: 1 })
    .sort({ mr: -1 })
    .lean();

  const maxPublicIdNum = lastByPublicId?.publicId
    ? parseInt(String(lastByPublicId.publicId).replace(/\D/g, ""), 10) || 0
    : 0;

  const maxMr = lastByMr?.mr ? Number(lastByMr.mr) : 0;

  console.log(`Current max publicId num: ${maxPublicIdNum}, max mr: ${maxMr}`);

  const docs = [];
  for (let i = 0; i < EXTRA_COUNT; i++) {
    const n = maxPublicIdNum + i + 1;
    const mrNum = maxMr + i + 1;
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const fullName = `${firstName} ${lastName}`;

    const regDate = randDateISO(720);   // registered within last 2 years
    const lastVisit = Math.random() < 0.7 ? randDateISO(180) : "";

    docs.push({
      publicId: `PT-${String(n).padStart(4, "0")}`,
      mr: mrNum,
      name: fullName,
      phone: phones(),
      email: randomEmail(fullName, n),
      age: randInt(5, 75),
      gender: randomGender(),
      city: pick(cities),
      address: `House ${randInt(1, 200)}, Street ${randInt(1, 30)}, ${pick(cities)}`,
      status: randomStatus(),
      registrationDate: regDate,
      lastVisit,
      tags: [],
    });
  }

  const result = await Patient.insertMany(docs, { ordered: false });
  const totalNow = await Patient.countDocuments({});

  console.log(`Inserted: ${result.length} patients`);
  console.log(`Total patients in DB: ${totalNow}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
