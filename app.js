import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

import { verifyApiKey } from "./middlewares/apiKeyMiddleware.js";

import channelRoutes from "./routes/channelRoutes.js";
import sensorRoutes from "./routes/sensorRoutes.js";

import setupSwagger from "./swagger.js";

const app = express();

setupSwagger(app);

// ---------- Security Middlewares ----------
app.use(helmet());
app.use(cors());
// app.use(xss());
app.use(morgan("dev"));
app.use(express.json());

// Rate limiting: 100 requests/15 minutes per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// const swaggerDocument = YAML.load("./docs/swagger.yaml");
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ---------- Routes ----------
app.use("/api/auth", verifyApiKey,authRoutes);
app.use("/api/dashboard", verifyApiKey, dashboardRoutes);
app.use("/api/channels",verifyApiKey, channelRoutes);
app.use("/api/sensors", verifyApiKey,sensorRoutes);

// ---------- Error Handling ----------
app.use(notFound);
app.use(errorHandler);

export default app;
