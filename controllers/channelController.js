import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { generateChannelId } from "../utils/generateChannelId.js";

/**
 * POST /api/channels
 * Create a new channel
 */
export const createChannel = async (req, res) => {
  try {
    const { projectName, description, fields } = req.body;
    if (!projectName || !fields?.length) {
      return res.status(400).json({ message: "Project name and at least one field are required" });
    }

    const channel = await Channel.create({
      channel_id: generateChannelId(),
      userId: req.user._id,
      projectName,
      description,
      fields
    });

    res.status(201).json({ message: "Channel created", channel });
  } catch (err) {
    console.error("createChannel:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/channels
 * Get all channels for the logged-in user (with latest data/counts)
 */
export const getMyChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ userId: req.user._id }).lean();
    const enriched = await Promise.all(channels.map(async ch => {
      const latest = await SensorData
        .findOne({ channelId: ch._id })
        .sort({ createdAt: -1 })
        .lean();
      const totalEntries = await SensorData.countDocuments({ channelId: ch._id });
      return {
        ...ch,
        latestData: latest?.data || null,
        lastUpdate: latest?.createdAt || null,
        totalEntries
      };
    }));
    res.json({ count: enriched.length, channels: enriched });
  } catch (err) {
    console.error("getMyChannels:", err);
    res.status(500).json({ message: "Failed to retrieve channels" });
  }
};

/**
 * GET /api/channels/user/:userId
 * Get all channels for any user (admin use)
 */
export const getChannelsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const channels = await Channel.find({ userId }).lean();
    const enriched = await Promise.all(channels.map(async ch => {
      const latest = await SensorData
        .findOne({ channelId: ch._id })
        .sort({ createdAt: -1 })
        .lean();
      const totalEntries = await SensorData.countDocuments({ channelId: ch._id });
      return {
        ...ch,
        latestData: latest?.data || null,
        lastUpdate: latest?.createdAt || null,
        totalEntries
      };
    }));
    res.json({ count: enriched.length, channels: enriched });
  } catch (err) {
    console.error("getChannelsByUserId:", err);
    res.status(500).json({ message: "Failed to retrieve user channels" });
  }
};

/**
 * GET /api/channels/:channelId/stats
 * Get a single channel’s stats (entries count + last update)
 */
export const getChannelRequestStats = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findOne({ channel_id: channelId, userId: req.user._id });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const totalEntries = await SensorData.countDocuments({ channelId: channel._id });
    const lastEntry = await SensorData
      .findOne({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    res.json({
      channelId,
      totalEntries,
      lastUpdate: lastEntry?.createdAt || null
    });
  } catch (err) {
    console.error("getChannelRequestStats:", err);
    res.status(500).json({ message: "Failed to compute channel stats" });
  }
};

/**
 * GET /api/channels/stats/overview
 * Get overall overview: total channels, total fields, total sensor posts
 */
export const getChannelsOverviewStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const channels = await Channel.find({ userId }).lean();
    const totalChannels = channels.length;
    const totalFields = channels.reduce((sum, ch) => sum + (ch.fields?.length || 0), 0);
    const totalRequests = await SensorData.countDocuments({
      channelId: { $in: channels.map(ch => ch._id) }
    });
    res.json({ totalChannels, totalFields, totalRequests });
  } catch (err) {
    console.error("getChannelsOverviewStats:", err);
    res.status(500).json({ message: "Failed to compute overview stats" });
  }
};

/**
 * GET /api/channels/stats/fields
 * Get per-channel field counts
 */
export const getChannelFieldsCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const channels = await Channel.find({ userId }).lean();
    const counts = channels.map(ch => ({
      channelId: ch.channel_id,
      fieldCount: ch.fields?.length || 0
    }));
    res.json({ counts });
  } catch (err) {
    console.error("getChannelFieldsCount:", err);
    res.status(500).json({ message: "Failed to compute fields count" });
  }
};

/**
 * GET /api/channels/:channelId
 * Get a single channel with its recent history
 */
export const getChannelById = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel
      .findOne({ channel_id: channelId, userId: req.user._id })
      .lean();
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
 * PUT /api/channels/:channelId
 * Update an existing channel
 */
export const updateChannel = async (req, res) => {
  try {
    const { projectName, description, fields } = req.body;
    const { channelId } = req.params;
    const channel = await Channel.findOne({ channel_id: channelId, userId: req.user._id });
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
 * DELETE /api/channels/:channelId
 * Delete a channel and its sensor data
 */
export const deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findOneAndDelete({ channel_id: channelId, userId: req.user._id });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    await SensorData.deleteMany({ channelId: channel._id });
    res.status(204).send();
  } catch (err) {
    console.error("deleteChannel:", err);
    res.status(500).json({ message: "Failed to delete channel" });
  }
};
