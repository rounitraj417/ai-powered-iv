import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import interviewRoutes from "./routes/interviewroutes.js";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://ai-powered-iv.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Middlewares
app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
;
