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
  updateSkills, 
} from "../controllers/auth.controllers.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadResume } from "../middleware/upload.middleware.js"; 

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword); 

router.use(protect);

router.post("/logout", logout);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/profile/skills", updateSkills); 

router.post(
  "/profile/parse-resume",
  uploadResume.single("resume"), 
  parseAndSaveResume
);

export default router;