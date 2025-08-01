import express from "express";
import {
  verifyPayment,
  getPaymentStatus,
  updatePaymentVerification,
  getPaymentHistory,
  getPlatformFeeInfo,
} from "../controllers/payment.controllers.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/fee-info", getPlatformFeeInfo);

router.use(protect);

router.post("/verify", verifyPayment);
router.get("/status/:jobId", getPaymentStatus);
router.put("/verify/:jobId", updatePaymentVerification);
router.get("/history", getPaymentHistory);

export default router;
