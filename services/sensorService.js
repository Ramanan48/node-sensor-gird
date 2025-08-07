import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { io } from "../socket/sensorSocket.js"; // socket.io instance

export const storeSensorData = async (channelId, body) => {
  const data = body.data || body;
  if (!data || typeof data !== "object") {
    throw { statusCode: 400, message: "Invalid data format" };
  }

  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) throw { statusCode: 404, message: "Channel not found" };

  const validFields = channel.fields.map(f => f.name);
  const cleanData = {};
  for (let key in data) {
    if (validFields.includes(key)) cleanData[key] = data[key];
  }

  if (Object.keys(cleanData).length === 0) {
    throw { statusCode: 400, message: "No valid fields provided" };
  }

  const sensorData = await SensorData.create({
    channelId: channel._id,
    data: cleanData
  });

  // 🔄 Broadcast via socket.io
  io.to(channelId).emit("sensor:update", {
    timestamp: sensorData.createdAt,
    ...cleanData
  });

  return { message: "Data stored", entryId: sensorData._id };
};

export const fetchLatestData = async (channelId) => {
  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) throw { statusCode: 404, message: "Channel not found" };

  return await SensorData.findOne({ channelId: channel._id })
    .sort({ createdAt: -1 })
    .select("data createdAt")
    .lean() || {};
};

export const fetchChannelHistory = async (channelId, { start, end, limit }) => {
  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) throw { statusCode: 404, message: "Channel not found" };

  const query = { channelId: channel._id };
  if (start || end) {
    query.createdAt = {};
    if (start) query.createdAt.$gte = new Date(start);
    if (end) query.createdAt.$lte = new Date(end);
  }

  return await SensorData.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 50)
    .select("data createdAt")
    .lean();
};
