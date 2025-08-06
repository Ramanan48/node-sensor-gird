import express from "express";
import { verifyApiKey } from "../middlewares/apiKeyMiddleware.js";
import {
  postSensorData,
  getLatestData,
  getChannelHistory
} from "../controllers/sensorController.js";

const router = express.Router();

// POST data from IoT sensor
router.post("/:channelId/data", verifyApiKey, postSensorData);

// GET latest data (frontend live chart)
router.get("/:channelId/latest", getLatestData);

// GET historical data (frontend)
router.get("/:channelId/history", getChannelHistory);

export default router;

// udpated