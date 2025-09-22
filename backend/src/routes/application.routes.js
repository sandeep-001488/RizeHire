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

const router = express.Router();

router.use(protect);

router.post("/jobs/:jobId/apply", applyToJob);

router.get("/my-applications", getMyApplications);

router.get("/jobs/:jobId/applicants", getJobApplicants);

router.get("/:applicationId", getApplication);

router.put("/:applicationId/status", updateApplicationStatus);

router.post("/:applicationId/feedback", addFeedback);

export default router;
