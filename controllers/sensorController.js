// controllers/sensorController.js
import * as sensorService from "../services/sensorService.js";

/**
 * POST /api/sensors/:channelId/data
 */
export const postSensorData = async (req, res) => {
  try {
    const result = await sensorService.storeSensorData(req.params.channelId, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

/**
 * GET /api/sensors/:channelId/latest
 */
export const getLatestData = async (req, res) => {
  try {
    const data = await sensorService.fetchLatestData(req.params.channelId);
    res.status(200).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

/**
 * GET /api/sensors/:channelId/history
 */
export const getChannelHistory = async (req, res) => {
  try {
    const data = await sensorService.fetchChannelHistory(req.params.channelId, req.query);
    res.status(200).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
