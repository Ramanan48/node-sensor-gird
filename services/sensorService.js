import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { io } from "../socket/socketServer.js";

/**
 * Store sensor data—no restriction on keys—and broadcast via WebSocket.
 */
export const storeSensorData = async (channelId, body) => {
  // Accept either { data: {...} } or raw {...}
  const payload = body.data || body;
  if (!payload || typeof payload !== "object") {
    throw { statusCode: 400, message: "Invalid data format" };
  }

  // Ensure the channel exists
  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) throw { statusCode: 404, message: "Channel not found" };

  // Create the record with whatever keys the client provided
  const entry = await SensorData.create({
    channelId: channel._id,
    data: payload
  });

  // Broadcast on the channel room
  if (io && typeof io.to === "function") {
    io.to(channelId).emit("sensor:update", {
      channelId,
      timestamp: entry.createdAt,
      data: payload
    });
  }

  return { message: "Data stored", entryId: entry._id };
};

/**
 * Fetch the latest sensor data entry for a channel.
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
 * Fetch historical sensor data entries, optional date range & limit.
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
