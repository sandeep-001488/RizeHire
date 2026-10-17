import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
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
import messageRoutes from "./src/routes/message.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import jobSeedRoutes from "./src/seeds/job.seeds.js";
import userSeedRoutes, { seedOnBoot } from "./src/seeds/user.seeds.js";

dotenv.config();

const app = express();
const allowedOrigin = process.env.FRONTEND_URL;
// Seeding is a no-op unless SEED_ON_BOOT=true (see src/seeds/user.seeds.js)
connectDB().then(() => seedOnBoot());

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.options(allowedOrigin, cors());

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many AI requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const notificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many notification requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/health", (_, res) => {
  res.json({
    success: true,
    message: "RizeHire Backend running!",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api", jobSeedRoutes);
app.use("/api", userSeedRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationLimiter, notificationRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/resume", resumeRoutes);

app.use(notFound);
app.use(errorHandler);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  socket.on("join", (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on("joinConversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`💬 Socket ${socket.id} joined conversation: ${conversationId}`);
  });

  socket.on("leaveConversation", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`🚪 Socket ${socket.id} left conversation: ${conversationId}`);
  });

  socket.on("typing", ({ conversationId, userId, userName }) => {
    socket.to(`conversation:${conversationId}`).emit("userTyping", {
      userId,
      userName,
      conversationId,
    });
  });

  socket.on("stopTyping", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("userStoppedTyping", {
      userId,
      conversationId,
    });
  });

  socket.on("notification:markAsRead", async (data) => {
    try {
      const Notification = (await import("./src/models/notification.model.js")).default;
      await Notification.markAsRead(data.notificationId);
      socket.emit("notification:markAsReadSuccess", { notificationId: data.notificationId });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  });

  socket.on("notification:delete", async (data) => {
    try {
      const Notification = (await import("./src/models/notification.model.js")).default;
      await Notification.deleteNotification(data.notificationId);
      socket.emit("notification:deleteSuccess", { notificationId: data.notificationId });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

export { io };

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time messaging`);
});