// controllers/deviceController.js
import Channel from "../models/Channel.js";
import { publish } from "../services/mqttClient.js";
import { commandTopic } from "../utils/mqttTopics.js";

/**
 * POST /api/devices/:channelId/command
 * Body: any JSON (e.g. {state:"on"} or {speed: 60} or {mode:"auto"})
 *
 * Publishes to MQTT command topic. Also emits socket "device:command".
 */
export const sendDeviceCommand = async (req, res) => {
  try {
    const { channelId } = req.params;
    const cmdPayload = req.body;

    if (!cmdPayload || typeof cmdPayload !== "object") {
      return res.status(400).json({ message: "Command payload must be an object" });
    }

    // Ensure channel belongs to current user
    const channel = await Channel.findOne({ channel_id: channelId, userId: req.user._id }).lean();
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const topic = commandTopic(channelId);
    const envelope = {
      source: "api",
      userId: String(req.user._id),
      channelId,
      at: new Date().toISOString(),
      command: cmdPayload
    };

    await publish(topic, envelope);

    // Also echo to Socket.IO room so UI updates instantly
    const io = req.app.get("io");
    if (io) io.to(channelId).emit("device:command", envelope);

    return res.status(202).json({ message: "Command accepted", topic, envelope });
  } catch (err) {
    console.error("sendDeviceCommand:", err);
    return res.status(500).json({ message: "Failed to send command" });
  }
};
