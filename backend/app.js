import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import { errorHandler, notFound } from "./src/middleware/error.middleware.js";

import authRoutes from "./src/routes/auth.routes.js";
import jobRoutes from "./src/routes/job.routes.js";
import aiRoutes from "./src/routes/ai.routes.js";
import paymentRoutes from "./src/routes/payment.route.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://rize-hire.vercel.app",
  "http://localhost:3000",
].filter(Boolean); 

console.log("🔍 Environment Variables:");
console.log("   FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("   NODE_ENV:", process.env.NODE_ENV);
console.log("   Allowed Origins:", allowedOrigins);

connectDB();

app.use(helmet());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        console.log(`✅ CORS: Allowed origin: ${origin}`);
        return callback(null, true);
      } else {
        console.log(`❌ CORS: Blocked origin: ${origin}`);
        console.log(`   Expected one of: ${allowedOrigins.join(", ")}`);
        return callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, try again later." },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "Welcome to RizeHire API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      jobs: "/api/jobs",
      ai: "/api/ai",
      payments: "/api/payments",
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_, res) => {
  res.json({
    success: true,
    message: "RizeHire Backend running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    allowedOrigins: allowedOrigins,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(", ")}`);
});
