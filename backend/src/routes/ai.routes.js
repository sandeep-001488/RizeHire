import express from "express";
import {
  extractSkills,
  calculateJobMatch,
  getJobRecommendations,
  getCareerSuggestions,
  optimizeJobDescription,
  generateInterviewQuestions,
  testAI,
} from "../controllers/ai.controllers.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect); 

router.get("/test", testAI);
router.post("/extract-skills", extractSkills); 
router.get("/recommendations", getJobRecommendations);
router.get("/career-suggestions", getCareerSuggestions);
router.post("/optimize-description", optimizeJobDescription);
router.get("/job-match/:jobId", calculateJobMatch); 
router.get("/interview-questions/:jobId", generateInterviewQuestions);

export default router;