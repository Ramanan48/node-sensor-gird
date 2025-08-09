import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { generateChannelId } from "../utils/generateChannelId.js";

/**
 * Create a new channel
 */
export const createChannel = async (req, res) => {
  try {
    const { projectName, description, fields } = req.body;
    if (!projectName || !fields?.length) {
      return res.status(400).json({ message: "Project name and at least one field are required" });
    }

    const newChannel = await Channel.create({
      channel_id: generateChannelId(),
      userId: req.user._id,
      projectName,
      description,
      fields
    });

    res.status(201).json({ message: "Channel created", channel: newChannel });
  } catch (err) {
    console.error("createChannel:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get all channels for logged-in user (with latest sensor data)
 */
export const getMyChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ userId: req.user._id }).lean();

    const enriched = await Promise.all(channels.map(async (ch) => {
      const latest = await SensorData.findOne({ channelId: ch._id }).sort({ createdAt: -1 }).lean();
      const count = await SensorData.countDocuments({ channelId: ch._id });
      return {
        ...ch,
        latestData: latest?.data || null,
        lastUpdate: latest?.createdAt || null,
        totalEntries: count
      };
    }));

    res.json({ count: enriched.length, channels: enriched });
  } catch (err) {
    console.error("getMyChannels:", err);
    res.status(500).json({ message: "Failed to retrieve channels" });
  }
};

/**
 * Get channels by user ID
 */
export const getChannelsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;
    const channels = await Channel.find({ userId }).lean();

    const enriched = await Promise.all(channels.map(async (ch) => {
      const latest = await SensorData.findOne({ channelId: ch._id }).sort({ createdAt: -1 }).lean();
      const count = await SensorData.countDocuments({ channelId: ch._id });
      return {
        ...ch,
        latestData: latest?.data || null,
        lastUpdate: latest?.createdAt || null,
        totalEntries: count
      };
    }));

    res.json({ count: enriched.length, channels: enriched });
  } catch (err) {
    console.error("getChannelsByUserId:", err);
    res.status(500).json({ message: "Error retrieving user channels" });
  }
};

/**
 * Get a single channel with full history
 */
export const getChannelById = async (req, res) => {
  try {
    const channel = await Channel.findOne({ channel_id: req.params.channelId, userId: req.user._id }).lean();
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const history = await SensorData.find({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    res.json({ ...channel, history });
  } catch (err) {
    console.error("getChannelById:", err);
    res.status(500).json({ message: "Error retrieving channel data" });
  }
};

/**
 * Update an existing channel
 */
export const updateChannel = async (req, res) => {
  try {
    const { projectName, description, fields } = req.body;
    const channel = await Channel.findOne({ channel_id: req.params.channelId, userId: req.user._id });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (projectName) channel.projectName = projectName;
    if (description) channel.description = description;
    if (fields) channel.fields = fields;

    await channel.save();
    res.json({ message: "Channel updated", channel });
  } catch (err) {
    console.error("updateChannel:", err);
    res.status(500).json({ message: "Failed to update channel" });
  }
};

/**
 * Delete a channel and its sensor data
 */
export const deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findOneAndDelete({ channel_id: req.params.channelId, userId: req.user._id });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    await SensorData.deleteMany({ channelId: channel._id });
    res.json({ message: "Channel and data deleted" });
  } catch (err) {
    console.error("deleteChannel:", err);
    res.status(500).json({ message: "Failed to delete channel" });
  }
};