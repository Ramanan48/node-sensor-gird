import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import channelRoutes from "./routes/channelRoutes.js";
import sensorRoutes from "./routes/sensorRoutes.js";

import { verifyApiKey } from "./middlewares/apiKeyMiddleware.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

// Trust reverse proxy headers (X-Forwarded-For, etc.)
app.set("trust proxy", 1);

// Security middlewares
app.use(helmet());

// Allow all origins and methods
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"] }));

app.use(morgan("dev"));
app.use(express.json());

// Rate limiting (100 requests per 15m per IP)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Routes
app.use("/api/auth",verifyApiKey, authRoutes);
app.use("/api/dashboard",verifyApiKey, dashboardRoutes);
app.use("/api/channels",verifyApiKey, channelRoutes);
app.use("/api/sensors",verifyApiKey, sensorRoutes);

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
