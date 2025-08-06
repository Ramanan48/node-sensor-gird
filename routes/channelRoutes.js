import express from "express";

import {
  createChannel,
  getMyChannels,
  getChannelById,
  updateChannel,
  deleteChannel,
    getChannelsByUserId,
} from "../controllers/channelController.js";

const router = express.Router();

router.post("/", createChannel);
router.get("/", getMyChannels);
router.get("/:channelId", getChannelById);
router.put("/:channelId", updateChannel);
router.delete("/:channelId", deleteChannel);
router.get("/user/:userId", getChannelsByUserId);

export default router;
