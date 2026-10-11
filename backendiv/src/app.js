import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// require all routes
import authRoutes from "./routes/auth.routes.js";
import interviewRoutes from "./routes/interviewroutes.js";

// using all routes
app.use("/api/auth", authRoutes);

app.use("/api/interview", interviewRoutes);

app.use((err, req, res, next) => {
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    message: err.message,
  });
});

export default app;
