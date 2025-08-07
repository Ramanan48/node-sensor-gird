// routes/sensorRoutes.js
import express from "express";
import {
  postSensorData,
  getLatestData,
  getChannelHistory,
} from "../controllers/sensorController.js";

const router = express.Router();

router.post( "/:channelId/data", postSensorData); // Sensor pushes data
router.get( "/:channelId/latest", getLatestData); // For live chart
router.get( "/:channelId/history", getChannelHistory); // For chart/table

export default router;
