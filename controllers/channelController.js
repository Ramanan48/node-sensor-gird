import Channel from "../models/Channel.js";
import SensorData from "../models/SensorData.js";
import { generateChannelId } from "../utils/generateChannelId.js";

// ✅ Create a new channel
export const createChannel = async (req, res) => {
  try {
    const { projectName, description, fields } = req.body;
    if (!projectName || !fields || !fields.length) {
      return res.status(400).json({ message: "Project name and at least 1 field are required" });
    }

    const channel = await Channel.create({
      channel_id: generateChannelId(),
      userId: req.user._id,
      projectName,
      description,
      fields
    });

    res.status(201).json({ message: "Channel created successfully", channel });
  } catch (error) {
    console.error("❌ createChannel:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get all channels for the logged-in user with latest sensor data
export const getMyChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ userId: req.user._id }).lean();

    // Attach latest sensor data for each channel
    const result = await Promise.all(
      channels.map(async (ch) => {
        const latestData = await SensorData.findOne({ channelId: ch._id })
          .sort({ createdAt: -1 })
          .lean();

        return { ...ch, latestData: latestData?.data || null, lastUpdate: latestData?.createdAt || null };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("❌ getMyChannels:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get single channel with full history
export const getChannelById = async (req, res) => {
  try {
    const channel = await Channel.findOne({ channel_id: req.params.channelId, userId: req.user._id }).lean();
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const history = await SensorData.find({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .lean();

    res.json({ ...channel, history });
  } catch (error) {
    console.error("❌ getChannelById:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update a channel (partial update)
export const updateChannel = async (req, res) => {
  try {
    const { projectName, description, fields } = req.body;

    const channel = await Channel.findOne({ channel_id: req.params.channelId, userId: req.user._id });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (projectName) channel.projectName = projectName;
    if (description) channel.description = description;
    if (fields) channel.fields = fields;

    await channel.save();
    res.json({ message: "Channel updated successfully", channel });
  } catch (error) {
    console.error("❌ updateChannel:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete channel and its sensor data
export const deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findOneAndDelete({
      channel_id: req.params.channelId,
      userId: req.user._id,
    });

    if (!channel) return res.status(404).json({ message: "Channel not found" });

    // Clean up associated sensor data
    await SensorData.deleteMany({ channelId: channel._id });

    res.json({ message: "Channel and its data deleted successfully" });
  } catch (error) {
    console.error("❌ deleteChannel:", error);
    res.status(500).json({ message: error.message });
  }
};


export const getChannelsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id; // allow logged-in or param

    const channels = await Channel.find({ userId }).lean();

    const result = await Promise.all(
      channels.map(async (ch) => {
        // Latest data for channel
        const latestData = await SensorData.findOne({ channelId: ch._id })
          .sort({ createdAt: -1 })
          .lean();

        // Count total entries for analytics
        const totalEntries = await SensorData.countDocuments({ channelId: ch._id });

        return {
          ...ch,
          latestData: latestData?.data || null,
          lastUpdate: latestData?.createdAt || null,
          totalEntries
        };
      })
    );

    res.json({ count: result.length, channels: result });
  } catch (error) {
    console.error("❌ getChannelsByUserId:", error);
    res.status(500).json({ message: error.message });
  }
};
