import express from "express";
import { getOwnerAppointments } from "../../controllers/owner.controller.js";

const router = express.Router();

// Appointments (Owner)
router.get("/appointments", getOwnerAppointments);

export default router;