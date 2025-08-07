// controllers/channelController.js
import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { generateChannelId } from "../utils/generateChannelId.js";

/**
 * GET /api/channels/stats/overview
 * Returns total channels, total sensor postings, total fields
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
 * Returns an object mapping each channelId to its field count
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
 * GET /api/channels/:channelId/stats
 * Returns per-channel stats: total entries and last entry timestamp
 */
export const getChannelRequestStats = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findOne({ channel_id: channelId, userId: req.user._id });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const totalEntries = await SensorData.countDocuments({ channelId: channel._id });
    const lastEntry = await SensorData.findOne({ channelId: channel._id })
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
