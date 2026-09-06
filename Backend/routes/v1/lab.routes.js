import express from "express";
import {
  getLabMe,
  updateLabMe,
  getLabStats,
  getLabCases,
  updateLabCaseStatus,
  updateLabCaseNote,
} from "../../controllers/lab.controller.js";
import {
  uploadLabCaseFiles, listLabCaseFiles, downloadFile,
  uploadMiddleware, uploadErrorHandler,
} from "../../controllers/file.controller.js";
import { getNotifications, markRead, markAllRead } from "../../controllers/notifications.controller.js";

const router = express.Router();

// Notifications — the SAME controller the owner uses. It scopes every query to
// req.user._id, so a user can only ever read their own; mounting it per role
// adds no new access path.
router.get("/notifications",            getNotifications);
router.patch("/notifications/read-all", markAllRead);
router.patch("/notifications/:id/read", markRead);


// Auth is applied at the mount point: routes/v1/index.js does
// `router.use("/lab", auth(["lab", "owner"]), labRoutes)`. Every handler
// below relies on req.user being populated by that middleware — do not
// mount this router anywhere else without equivalent protection.
router.get("/me", getLabMe);
router.patch("/me", updateLabMe);

router.get("/stats", getLabStats);
router.get("/cases", getLabCases);
router.patch("/cases/:id/status", updateLabCaseStatus);
router.patch("/cases/:id/note", updateLabCaseNote);

// Attachments. Access is decided per CASE inside the controller (the lab sees
// only cases assigned to it), so no extra permission gate is needed here.
router.get("/cases/:caseId/files", listLabCaseFiles);
router.post("/cases/:caseId/files", uploadMiddleware, uploadErrorHandler, uploadLabCaseFiles);
// Streaming a file is the only way bytes leave the server; the controller
// re-checks case access per owner type, so no extra gate is needed here.
router.get("/files/:id", downloadFile);

export default router;