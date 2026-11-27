import express from "express";
import {
  applyToJob,
  getDashboardStats,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
  getApplication,
  getApplicationResume,
} from "../controllers/application.controllers.js";
import { protect } from "../middleware/auth.middleware.js";
import { isPoster } from "../middleware/role.middleware.js";
import { uploadResume } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/jobs/:jobId/apply", uploadResume.single("resume"), applyToJob);
router.get("/my-applications", getMyApplications);
// Static path: must stay above "/:applicationId" or that param route would swallow it
router.get("/dashboard-stats", getDashboardStats);

router.get("/jobs/:jobId/applicants", isPoster, getJobApplicants);
router.put("/:applicationId/status", isPoster, updateApplicationStatus);

router.get("/:applicationId", getApplication);
router.get("/:applicationId/resume", getApplicationResume);

export default router;