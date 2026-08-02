import mongoose from "mongoose";
import { config } from "dotenv";
config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const AuditLog = mongoose.connection.collection("auditlogs");

    const total = await AuditLog.countDocuments();
    console.log(`Total audit entries: ${total}\n`);

    const recent = await AuditLog.find({}).sort({ at: -1 }).limit(5).toArray();
    recent.forEach((e, i) => {
        console.log(`--- Entry ${i + 1} ---`);
        console.log(`action:      ${e.action}`);
        console.log(`actor:       ${e.actorName} (${e.actorRole})`);
        console.log(`entity:      ${e.entityType} / ${e.entityLabel}`);
        console.log(`at:          ${e.at}`);
        console.log(`ip:          ${e.ip}`);
        console.log(`hashPrev:    ${e.hashPrev}`);
        console.log(`hashSelf:    ${e.hashSelf}`);
        console.log("");
    });

    await mongoose.disconnect();
}
run().catch((err) => { console.error(err); process.exit(1); });