// routes/deviceRoutes.js
import express from "express";
import { verifyApiKey } from "../middlewares/apiKeyMiddleware.js";
import { sendDeviceCommand } from "../controllers/deviceController.js";

const router = express.Router();

// Frontend → Server → MQTT
router.post("/:channelId/command", verifyApiKey, sendDeviceCommand);

export default router;
