import mongoose from "mongoose";
import { config } from "dotenv";
config();

import User from "../models/User.model.js";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing in .env");
  process.exit(1);
}

const admin = {
  publicId: "OWNER-1",
  name: "Clinic Owner",
  email: "fdcpak1@gmail.com",
  phone: "0300-0000000",
  role: "owner",
  enabled: true,
  password: "owner123",        // ✅ Change this to a strong password
};

async function seedAdmin() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ DB connected");

  // Check if admin already exists
  const existing = await User.findOne({ email: admin.email });
  if (existing) {
    console.log(`⚠️  Admin already exists: ${admin.email}`);
    console.log("💡 Delete it first or update the password manually.");
    await mongoose.disconnect();
    return;
  }

  // Create and hash password
  const { password, ...rest } = admin;
  const doc = new User(rest);
  await doc.setPassword(password);
  await doc.save();

  console.log("✅ Admin seeded successfully:");
  console.log(`   Email   : ${admin.email}`);
  console.log(`   Password: ${admin.password}`);
  console.log(`   Role    : ${admin.role}`);

  await mongoose.disconnect();
  console.log("✅ DB disconnected");
}

seedAdmin().catch((err) => {
  console.error("❌ Admin seed failed:", err);
  process.exit(1);
});