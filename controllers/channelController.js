import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { generateChannelId } from "../utils/generateChannelId.js";

/**
 * POST /api/channels
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
    return res.status(201).json({ message: "Channel created", channel });
  } catch (err) {
    console.error("createChannel:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/channels
 */
export const getMyChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ userId: req.user._id }).lean();
    const enriched = await Promise.all(channels.map(async ch => {
      const latest = await SensorData.findOne({ channelId: ch._id }).sort({ createdAt: -1 }).lean();
      const totalEntries = await SensorData.countDocuments({ channelId: ch._id });
      return {
        ...ch,
        latestData: latest?.data || null,
        lastUpdate: latest?.createdAt || null,
        totalEntries
      };
    }));
    return res.status(200).json({ count: enriched.length, channels: enriched });
  } catch (err) {
    console.error("getMyChannels:", err);
    return res.status(500).json({ message: "Failed to retrieve channels" });
  }
};

/**
 * GET /api/channels/user/:userId
 */
export const getChannelsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const channels = await Channel.find({ userId }).lean();
    const enriched = await Promise.all(channels.map(async ch => {
      const latest = await SensorData.findOne({ channelId: ch._id }).sort({ createdAt: -1 }).lean();
      const totalEntries = await SensorData.countDocuments({ channelId: ch._id });
      return {
        ...ch,
        latestData: latest?.data || null,
        lastUpdate: latest?.createdAt || null,
        totalEntries
      };
    }));
    return res.status(200).json({ count: enriched.length, channels: enriched });
  } catch (err) {
    console.error("getChannelsByUserId:", err);
    return res.status(500).json({ message: "Failed to retrieve user channels" });
  }
};

/**
 * GET /api/channels/:channelId/stats
 */
export const getChannelRequestStats = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findOne({ channel_id: channelId, userId: req.user._id });
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }
    const totalEntries = await SensorData.countDocuments({ channelId: channel._id });
    const lastEntry = await SensorData.findOne({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();
    return res.status(200).json({
      channelId,
      totalEntries,
      lastUpdate: lastEntry?.createdAt || null
    });
  } catch (err) {
    console.error("getChannelRequestStats:", err);
    return res.status(500).json({ message: "Failed to compute channel stats" });
  }
};

/**
 * GET /api/channels/stats/overview
 */
export const getChannelsOverviewStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const channels = await Channel.find({ userId }).lean();
    const totalChannels = channels.length;
    const totalFields   = channels.reduce((sum, ch) => sum + (ch.fields?.length || 0), 0);
    const totalRequests = await SensorData.countDocuments({
      channelId: { $in: channels.map(ch => ch._id) }
    });
    return res.status(200).json({ totalChannels, totalFields, totalRequests });
  } catch (err) {
    console.error("getChannelsOverviewStats:", err);
    return res.status(500).json({ message: "Failed to compute overview stats" });
  }
};

/**
 * GET /api/channels/stats/fields
 */
export const getChannelFieldsCount = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const channels = await Channel.find({ userId }).lean();
    const counts = channels.map(ch => ({
      channelId: ch.channel_id,
      fieldCount: ch.fields?.length || 0
    }));
    return res.status(200).json({ counts });
  } catch (err) {
    console.error("getChannelFieldsCount:", err);
    return res.status(500).json({ message: "Failed to compute fields count" });
  }
};

/**
 * Other channel endpoints (getChannelById, updateChannel, deleteChannel) remain unchanged...
 */
