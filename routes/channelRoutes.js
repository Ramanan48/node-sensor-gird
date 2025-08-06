import express from "express";
import { verifyApiKey } from "../middlewares/apiKeyMiddleware.js";
import {
  createChannel,
  getMyChannels,
  getChannelById,
  updateChannel,
  deleteChannel
} from "../controllers/channelController.js";

const router = express.Router();

router.post("/", verifyApiKey, createChannel);
router.get("/", verifyApiKey, getMyChannels);
router.get("/:channelId", verifyApiKey, getChannelById);
router.put("/:channelId", verifyApiKey, updateChannel);
router.delete("/:channelId", verifyApiKey, deleteChannel);

export default router;
