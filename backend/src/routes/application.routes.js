import express from "express";
import {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
  addFeedback,
  getApplication,
} from "../controllers/application.controllers.js";
import { protect } from "../middleware/auth.middleware.js";
import { isPoster } from "../middleware/role.middleware.js"; 

const router = express.Router();

router.use(protect);

// --- Applicant Routes ---
router.post("/jobs/:jobId/apply", applyToJob);
router.get("/my-applications", getMyApplications);

// --- Recruiter (Poster) Routes ---
router.get("/jobs/:jobId/applicants", isPoster, getJobApplicants);
router.put("/:applicationId/status", isPoster, updateApplicationStatus);
router.post("/:applicationId/feedback", isPoster, addFeedback);

// --- Shared Route (Applicant & Poster) ---
router.get("/:applicationId", getApplication);

export default router;