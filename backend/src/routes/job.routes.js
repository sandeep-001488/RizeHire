import express from "express";
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  getMyJobs,
  getRecommendations,
  searchSkills,
} from "../controllers/job.controllers.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";
import { isPoster, hasWallet } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", optionalAuth, getJobs);
router.get("/skills/search", searchSkills); // Public: registered above protect

router.use(protect);

router.post("/", isPoster, hasWallet, createJob);

router.get("/my-posted-jobs", isPoster, getMyJobs);

// Must be before /:id route
router.get("/recommendations/for-me", getRecommendations);

router.get("/:id", getJob);

router.put("/:id", isPoster, updateJob);

router.delete("/:id", isPoster, deleteJob);

export default router;
