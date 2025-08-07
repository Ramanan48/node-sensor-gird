import * as sensorService from "../services/sensorService.js";

export const postSensorData = async (req, res) => {
  try {
    const response = await sensorService.storeSensorData(req.params.channelId, req.body);
    res.status(201).json(response);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const getLatestData = async (req, res) => {
  try {
    const data = await sensorService.fetchLatestData(req.params.channelId);
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const getChannelHistory = async (req, res) => {
  try {
    const data = await sensorService.fetchChannelHistory(req.params.channelId, req.query);
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
