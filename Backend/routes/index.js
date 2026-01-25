import express from "express";
import labRoutes from "./lab.routes.js";

// ✅ Register all mongoose models once at startup
import "../models/User.model.js";
import "../models/Patient.model.js";
import "../models/SampleType.model.js";
import "../models/LabCase.model.js";
import "../models/LabBill.model.js";

const router = express.Router();

router.use("/lab", labRoutes);

export default router;