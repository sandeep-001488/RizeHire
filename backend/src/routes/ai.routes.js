import express from "express";
import {
  extractSkills,
  calculateJobMatch,
  getJobRecommendations,
  getCareerSuggestions,
  optimizeJobDescription,
  generateInterviewQuestions,
  testAI,
  suggestSkills,
  trainMLModel,
  getMLModelPerformance,
  getMLPrediction,
} from "../controllers/ai.controllers.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/test", testAI);
router.post("/extract-skills", extractSkills);
router.get("/recommendations", getJobRecommendations);
router.get("/career-suggestions", getCareerSuggestions);
router.post("/optimize-description", optimizeJobDescription);
router.post("/suggest-skills", suggestSkills);
router.get("/job-match/:jobId", calculateJobMatch);
router.get("/interview-questions/:jobId", generateInterviewQuestions);

// ML Model Endpoints
router.post("/ml/train", trainMLModel); // Train the neural network
router.get("/ml/performance", getMLModelPerformance); // Get model metrics
router.get("/ml/predict/:jobId", getMLPrediction); // Get ML prediction for a job

export default router;