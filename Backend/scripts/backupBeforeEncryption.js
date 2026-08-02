import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const dir = path.join("E:", "Projects", "Dr Saif", "db-backups", "pre-encryption");
    fs.mkdirSync(dir, { recursive: true });

    // back up the collections that encryption touches (and a couple of key ones)
    const collections = ["prescriptions", "patients", "appointments", "invoices", "auditlogs"];
    for (const name of collections) {
        const docs = await db.collection(name).find({}).toArray();
        fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
        console.log(`Backed up ${name}: ${docs.length} documents`);
    }
    await mongoose.disconnect();
    console.log("Backup complete:", dir);
}
run().catch((e) => { console.error(e); process.exit(1); });