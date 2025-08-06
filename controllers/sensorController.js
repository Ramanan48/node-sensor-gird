import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";

// ✅ 1. Receive sensor data (IoT device POST)
export const postSensorData = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { data } = req.body; // e.g., { temperature: 25.5, humidity: 70 }

    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Data must be an object of field:value" });
    }

    const channel = await Channel.findOne({ channel_id: channelId });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    // Validate fields
    const validFields = channel.fields.map(f => f.name);
    const cleanData = {};
    for (let key in data) {
      if (validFields.includes(key)) cleanData[key] = data[key];
    }

    if (Object.keys(cleanData).length === 0) {
      return res.status(400).json({ message: "No valid fields provided" });
    }

    const sensorData = await SensorData.create({
      channelId: channel._id,
      data: cleanData
    });

    res.status(201).json({ message: "Data stored", entryId: sensorData._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ 2. Get latest sensor data (Frontend charts)
export const getLatestData = async (req, res) => {
  const { channelId } = req.params;
  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) return res.status(404).json({ message: "Channel not found" });

  const latest = await SensorData.findOne({ channelId: channel._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json(latest || {});
};

// ✅ 3. Get historical data (Frontend table or chart)
export const getChannelHistory = async (req, res) => {
  const { channelId } = req.params;
  const channel = await Channel.findOne({ channel_id: channelId });
  if (!channel) return res.status(404).json({ message: "Channel not found" });

  const history = await SensorData.find({ channelId: channel._id })
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 50)
    .lean();

  res.json(history);
};
