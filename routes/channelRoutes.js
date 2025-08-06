import express from "express";

import {
  createChannel,
  getMyChannels,
  getChannelById,
  updateChannel,
  deleteChannel
} from "../controllers/channelController.js";

const router = express.Router();

router.post("/", createChannel);
router.get("/", getMyChannels);
router.get("/:channelId", getChannelById);
router.put("/:channelId", updateChannel);
router.delete("/:channelId", deleteChannel);

export default router;
