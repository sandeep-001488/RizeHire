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
  checkExplainabilityService,
  getSHAPForJob,
  getLIMEForJob,
  getCombinedExplanationForJob,
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

// Explainability Endpoints (SHAP & LIME)
router.get("/explainability/health", checkExplainabilityService); // Check Python service health
router.get("/explainability/shap/:jobId", getSHAPForJob); // Get SHAP explanation
router.get("/explainability/lime/:jobId", getLIMEForJob); // Get LIME explanation
router.get("/explainability/combined/:jobId", getCombinedExplanationForJob); // Get both SHAP + LIME

export default router;