// services/sensorService.js
import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { io } from "../socket/sensorSocket.js";

/**
 * Store sensor data with no restriction on keys, then broadcast.
 */
export const storeSensorData = async (channelId, body) => {
  const payload = body.data || body;
  if (!payload || typeof payload !== "object") {
    throw { statusCode: 400, message: "Invalid data format" };
  }

  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) throw { statusCode: 404, message: "Channel not found" };

  const entry = await SensorData.create({
    channelId: channel._id,
    data: payload,
  });

  if (io && typeof io.to === "function") {
    io.to(channelId).emit("sensor:update", {
      channelId,
      timestamp: entry.createdAt,
      data: payload,
    });
  }

  return { message: "Data stored", entryId: entry._id };
};

/**
 * Fetch the latest data entry for a channel.
 */
export const fetchLatestData = async (channelId) => {
  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) throw { statusCode: 404, message: "Channel not found" };

  return (
    await SensorData.findOne({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .select("data createdAt")
      .lean()
  ) || {};
};

/**
 * Fetch historical data entries, with optional start/end and limit.
 */
export const fetchChannelHistory = async (channelId, { start, end, limit }) => {
  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) throw { statusCode: 404, message: "Channel not found" };

  const query = { channelId: channel._id };
  if (start || end) {
    query.createdAt = {};
    if (start) query.createdAt.$gte = new Date(start);
    if (end)   query.createdAt.$lte = new Date(end);
  }

  return await SensorData.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 50)
    .select("data createdAt")
    .lean();
};
