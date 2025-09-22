import express from "express";
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  getMyJobs,
} from "../controllers/job.controllers.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";
import { requirePayment } from "../middleware/payment.middleware.js";


const router = express.Router();

router.get("/", optionalAuth, getJobs);

router.use(protect);

router.post("/", requirePayment, createJob);
router.get("/my-posted-jobs", getMyJobs);

router.get("/:id", getJob);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

export default router;
