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
import applicationRoutes from "./src/routes/application.routes.js";
import aiRoutes from "./src/routes/ai.routes.js";
import resumeRoutes from "./src/routes/resume.routes.js";
import jobSeedRoutes from "./src/seeds/job.seeds.js";

dotenv.config();

const app = express();
const allowedOrigin = process.env.FRONTEND_URL;
connectDB();

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.options(allowedOrigin, cors());

// Rate limiter specifically for AI routes only
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 AI requests per 15 minutes
  message: { error: "Too many AI requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// --- Health Check Route ---
app.get("/health", (_, res) => {
  res.json({
    success: true,
    message: "RizeHire Backend running!",
    timestamp: new Date().toISOString(),
  });
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api", jobSeedRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/ai", aiLimiter, aiRoutes); // Apply rate limiter only to AI routes
app.use("/api/resume", resumeRoutes);


// --- Error Handling ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});