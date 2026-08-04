import express from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import { getMyLoginHistory, logoutAllDevices } from "../../controllers/session.controller.js";

const router = express.Router();

const ALL_ROLES = ["owner", "dentist", "receptionist", "lab"];
const requireAuth = auth(ALL_ROLES);

router.get("/login-history",       requireAuth, getMyLoginHistory);
router.post("/logout-all-devices", requireAuth, logoutAllDevices);

export default router;
