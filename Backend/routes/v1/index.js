import express from "express";
import labRoutes from "./lab.routes.js";
import dentistRoutes from "./dentist.routes.js";
import authRoutes from "./auth.routes.js";
import receptionistRoutes from "./receptionist.routes.js";
import ownerRoutes from "./owner.routes.js";
import permissionsRoutes from "./permissions.routes.js";
import auditRoutes from "./audit.routes.js";
import { auth } from "../../middlewares/auth.middleware.js";
import { getClinicConfigCtrl, switchCountryCtrl, switchLocaleCtrl } from "../../controllers/clinicConfig.controller.js";

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

// ✅ ADD THIS (owner patients uses invoices)
import "../../models/Invoice.model.js";
import "../../models/AuditLog.model.js";

const router = express.Router();

router.use("/auth", authRoutes);

// Shared config endpoints — all authenticated roles
router.get(
  "/clinic-config",
  auth(["dentist", "receptionist", "owner", "lab"]),
  getClinicConfigCtrl
);
router.patch(
  "/clinic-config/country",
  auth(["dentist", "receptionist", "owner", "lab"]),
  switchCountryCtrl
);
router.patch(
  "/clinic-config/locale",
  auth(["dentist", "receptionist", "owner", "lab"]),
  switchLocaleCtrl
);

router.use("/lab", auth(["lab", "owner"]), labRoutes);
router.use("/dentist", auth(["dentist", "owner"]), dentistRoutes);
router.use("/receptionist", auth(["receptionist", "owner"]), receptionistRoutes);

router.use("/owner", auth(["owner"]), ownerRoutes);

router.use("/permissions", auth(["dentist", "receptionist", "owner"]), permissionsRoutes);

router.use("/audit", auth(["owner", "receptionist"]), auditRoutes);

export default router;