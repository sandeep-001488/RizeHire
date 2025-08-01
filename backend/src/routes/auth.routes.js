import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
} from "../controllers/auth.controllers.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);

router.use(protect);

router.post("/logout", logout);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

export default router;
