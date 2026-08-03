import express from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import {
  get2faStatus,
  setup2fa,
  verifySetup,
  sendOtpForUser,
  verify2faLogin,
  disable2fa,
} from "../../controllers/twoFactor.controller.js";

const router = express.Router();

const ALL_ROLES = ["owner", "dentist", "receptionist", "lab"];
const requireAuth = auth(ALL_ROLES);

// Unauthenticated — uses challengeToken in body (issued by login step 1)
router.post("/login",         verify2faLogin);

// All of the below require a full (non-challenge) JWT
router.get( "/status",        requireAuth, get2faStatus);
router.post("/setup",         requireAuth, setup2fa);
router.post("/verify-setup",  requireAuth, verifySetup);
router.post("/send-otp",      requireAuth, sendOtpForUser);
router.post("/disable",       requireAuth, disable2fa);

export default router;