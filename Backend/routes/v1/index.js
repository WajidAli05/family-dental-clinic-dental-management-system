import express from "express";
import labRoutes from "./lab.routes.js";
import dentistRoutes from "./dentist.routes.js";
import authRoutes from "./auth.routes.js";
import receptionistRoutes from "./receptionist.routes.js";
import ownerRoutes from "./owner.routes.js";
import { auth } from "../../middlewares/auth.middleware.js";

// ✅ Register all mongoose models once at startup
import "../../models/User.model.js";
import "../../models/Patient.model.js";
import "../../models/SampleType.model.js";
import "../../models/LabCase.model.js";
import "../../models/LabBill.model.js";
import "../../models/LabSample.model.js";

// ✅ Dentist models
import "../../models/Appointment.model.js";
import "../../models/Prescription.model.js";

const router = express.Router();

router.use("/auth", authRoutes);

router.use("/lab", auth(["lab", "owner"]), labRoutes);

// ✅ Enable dentist auth (same as lab)
router.use("/dentist", auth(["dentist","owner"]), dentistRoutes);

router.use("/receptionist", auth(["receptionist", "owner"]), receptionistRoutes);

router.use("/owner", auth(["owner"]), ownerRoutes);

export default router;