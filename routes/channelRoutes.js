import express from "express";
import {
  createChannel,
  getMyChannels,
  getChannelsByUserId,
  getChannelRequestStats,
  getChannelsOverviewStats,
  getChannelFieldsCount,
  getChannelById,
  updateChannel,
  deleteChannel
} from "../controllers/channelController.js";
import { verifyApiKey } from "../middlewares/apiKeyMiddleware.js";

const router = express.Router();

// Create channel
router.post("/", verifyApiKey, createChannel);

// List user’s channels
router.get("/", verifyApiKey, getMyChannels);

// Overall statistics
router.get("/stats/overview", verifyApiKey, getChannelsOverviewStats);
router.get("/stats/fields",   verifyApiKey, getChannelFieldsCount);

// Per-channel stats
router.get("/:channelId/stats", verifyApiKey, getChannelRequestStats);

// Admin: channels by arbitrary user
router.get("/user/:userId", verifyApiKey, getChannelsByUserId);

// Fetch one channel + history
router.get("/:channelId", verifyApiKey, getChannelById);

// Update & delete
router.put("/:channelId", verifyApiKey, updateChannel);
router.delete("/:channelId", verifyApiKey, deleteChannel);

export default router;
