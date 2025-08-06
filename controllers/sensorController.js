import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";

// ✅ 1. Receive sensor data (POST from IoT)
export const postSensorData = async (req, res) => {
  try {
    const { channelId } = req.params;
    const data = req.body.data || req.body; // Flexible JSON format

    if (!data || typeof data !== "object") {
      console.log("❌ Invalid body:", req.body);
      return res.status(400).json({ message: "Invalid data format" });
    }

    const channel = await Channel.findOne({ channel_id: channelId });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    // Filter only valid fields
    const validFields = channel.fields.map(f => f.name);
    const cleanData = {};
    for (let key in data) {
      if (validFields.includes(key)) cleanData[key] = data[key];
    }

    if (Object.keys(cleanData).length === 0) {
      console.log("⚠️ Ignored keys:", Object.keys(data));
      return res.status(400).json({ message: "No valid fields provided" });
    }

    const sensorData = await SensorData.create({
      channelId: channel._id,
      data: cleanData
    });

    res.status(201).json({ message: "Data stored", entryId: sensorData._id });
  } catch (error) {
    console.error("❌ postSensorData:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ 2. Get latest sensor data
export const getLatestData = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findOne({ channel_id: channelId });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const latest = await SensorData.findOne({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(latest || {});
  } catch (error) {
    console.error("❌ getLatestData:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ 3. Get historical sensor data with optional date filtering
export const getChannelHistory = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { start, end, limit } = req.query;

    const channel = await Channel.findOne({ channel_id: channelId });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const query = { channelId: channel._id };

    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }

    const history = await SensorData.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50)
      .lean();

    res.json(history);
  } catch (error) {
    console.error("❌ getChannelHistory:", error);
    res.status(500).json({ message: error.message });
  }
};
