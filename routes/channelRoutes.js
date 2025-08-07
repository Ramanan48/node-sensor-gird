// routes/channelRoutes.js
import express from "express";
import {
  createChannel,
  getMyChannels,
  getChannelById,
  updateChannel,
  deleteChannel,
  getChannelsByUserId,
  getChannelsOverviewStats,
  getChannelFieldsCount,
  getChannelRequestStats
} from "../controllers/channelController.js";
import { verifyApiKey } from "../middlewares/apiKeyMiddleware.js";

const router = express.Router();

/**
 * @route POST /api/channels
 * @desc Create a new channel (requires API key)
 */
router.post("/", verifyApiKey, createChannel);

/**
 * @route GET /api/channels
 * @desc Get all channels for the logged-in user (with latest sensor data)
 */
router.get("/", verifyApiKey, getMyChannels);

/**
 * @route GET /api/channels/user/:userId
 * @desc Get channels by user ID (admin or user)
 */
router.get("/user/:userId", verifyApiKey, getChannelsByUserId);

/**
 * @route GET /api/channels/:channelId
 * @desc Get a single channel with history
 */
router.get("/:channelId", verifyApiKey, getChannelById);

/**
 * @route GET /api/channels/:channelId/stats
 * @desc Get per-channel request and entry stats
 */
router.get("/:channelId/stats", verifyApiKey, getChannelRequestStats);

/**
 * @route GET /api/channels/stats/overview
 * @desc Get overall channels overview: total channels, total fields, total requests
 */
router.get("/stats/overview", verifyApiKey, getChannelsOverviewStats);

/**
 * @route GET /api/channels/stats/fields
 * @desc Get count of all fields across all channels for the user
 */
router.get("/stats/fields", verifyApiKey, getChannelFieldsCount);

/**
 * @route PUT /api/channels/:channelId
 * @desc Update a channel by ID
 */
router.put("/:channelId", verifyApiKey, updateChannel);

/**
 * @route DELETE /api/channels/:channelId
 * @desc Delete a channel by ID and its sensor data
 */
router.delete("/:channelId", verifyApiKey, deleteChannel);

export default router;
