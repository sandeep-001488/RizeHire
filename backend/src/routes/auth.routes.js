import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  parseAndSaveResume,
  forgotPassword, 
  resetPassword, 
} from "../controllers/auth.controllers.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadResume } from "../middleware/upload.middleware.js"; 

const router = express.Router();

// --- Public Routes ---
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword); 

// --- Protected Routes ---
router.use(protect);

router.post("/logout", logout);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

//uploading and parsing resume
router.post(
  "/profile/parse-resume",
  uploadResume.single("resume"), // "resume" is the field name
  parseAndSaveResume
);

export default router;