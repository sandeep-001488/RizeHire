import express from "express";
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  applyToJob,
  getMyJobs,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
} from "../controllers/job.controllers.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", optionalAuth, getJobs);

router.use(protect);

router.get("/user/my-jobs", getMyJobs);
router.get("/user/my-applications", getMyApplications);

router.post("/", createJob);

router.get("/:id/applicants", getJobApplicants);
router.put("/:jobId/applications/:applicationId", updateApplicationStatus);

router.get("/:id", getJob);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);
router.post("/:id/apply", applyToJob);

export default router;
// import express from "express";
// import {
//   createJob,
//   getJobs,
//   getJob,
//   updateJob,
//   deleteJob,
//   applyToJob,
//   getMyJobs,
//   getMyApplications,
//   getJobApplicants,
//   updateApplicationStatus,
// } from "../controllers/job.controllers.js";
// import { protect, optionalAuth } from "../middleware/auth.middleware.js";

// const router = express.Router();

// router.get("/", optionalAuth, getJobs);

// router.use(protect);

// router.get("/user/my-jobs", getMyJobs);
// router.get("/user/my-applications", getMyApplications);

// router.post("/", createJob);

// router.get("/:id", getJob);
// router.put("/:id", updateJob);
// router.delete("/:id", deleteJob);
// router.post("/:id/apply", applyToJob);

// router.get("/:id/applicants", getJobApplicants);
// router.put("/:jobId/applications/:applicationId", updateApplicationStatus);

// export default router;
