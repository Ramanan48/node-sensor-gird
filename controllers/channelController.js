import Channel from "../models/Channel.js";
import { generateChannelId } from "../utils/generateChannelId.js";

// Create Channel
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

    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all channels for logged-in user
export const getMyChannels = async (req, res) => {
  const channels = await Channel.find({ userId: req.user._id });
  res.json(channels);
};

// Get single channel
export const getChannelById = async (req, res) => {
  const channel = await Channel.findOne({ channel_id: req.params.channelId, userId: req.user._id });
  if (!channel) return res.status(404).json({ message: "Channel not found" });
  res.json(channel);
};

// Update channel
export const updateChannel = async (req, res) => {
  const channel = await Channel.findOne({ channel_id: req.params.channelId, userId: req.user._id });
  if (!channel) return res.status(404).json({ message: "Channel not found" });

  const { projectName, description, fields } = req.body;
  if (projectName) channel.projectName = projectName;
  if (description) channel.description = description;
  if (fields) channel.fields = fields;

  await channel.save();
  res.json(channel);
};

// Delete channel
export const deleteChannel = async (req, res) => {
  const channel = await Channel.findOneAndDelete({
    channel_id: req.params.channelId,
    userId: req.user._id,
  });

  if (!channel) return res.status(404).json({ message: "Channel not found" });
  res.json({ message: "Channel deleted successfully" });
};
