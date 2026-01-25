import express from "express";
import labRoutes from "./lab.routes.js";
import authRoutes from "./auth.routes.js";
import { auth } from "../../middlewares/auth.middleware.js";

// ✅ Register all mongoose models once at startup
import "../../models/User.model.js";
import "../../models/Patient.model.js";
import "../../models/SampleType.model.js";
import "../../models/LabCase.model.js";
import "../../models/LabBill.model.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/lab", auth(["lab"]), labRoutes);

export default router;