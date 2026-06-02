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

router.post("/ml/train", trainMLModel);
router.get("/ml/performance", getMLModelPerformance);
router.get("/ml/predict/:jobId", getMLPrediction);

router.get("/explainability/health", checkExplainabilityService);
router.get("/explainability/shap/:jobId", getSHAPForJob);
router.get("/explainability/lime/:jobId", getLIMEForJob);
router.get("/explainability/combined/:jobId", getCombinedExplanationForJob);

export default router;