import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

const app = express();

// ---------- Security Middlewares ----------
app.use(helmet());
app.use(cors());
// app.use(xss());
app.use(morgan("dev"));
app.use(express.json());

// Rate limiting: 100 requests/15 minutes per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// ---------- Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ---------- Error Handling ----------
app.use(notFound);
app.use(errorHandler);

export default app;
