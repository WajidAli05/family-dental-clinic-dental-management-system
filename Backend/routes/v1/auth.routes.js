import express from "express";
import { login } from "../../controllers/auth.controller.js";
import twoFactorRoutes from "./twoFactor.routes.js";
import sessionRoutes from "./session.routes.js";

const router = express.Router();

router.post("/login", login);
router.use("/2fa", twoFactorRoutes);
router.use("/session", sessionRoutes);

export default router;