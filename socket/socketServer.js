// socket/socketServer.js
import { Server } from "socket.io";
import { publish } from "../services/mqttClient.js";
import { commandTopic } from "../utils/mqttTopics.js";

let io;

/**
 * Initialize Socket.IO on the provided HTTP server.
 * Allows all origins (tighten in production).
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join/leave channel rooms for targeted updates
    socket.on("subscribe", (channelId) => {
      if (!channelId) return;
      socket.join(channelId);
    });

    socket.on("unsubscribe", (channelId) => {
      if (!channelId) return;
      socket.leave(channelId);
    });

    // Optional: allow UI to send device commands over Socket.IO
    // (If you need auth, prefer the REST endpoint and just emit back to sockets.)
    socket.on("device:command", async ({ channelId, command }) => {
      try {
        if (!channelId || !command || typeof command !== "object") return;

        const topic = commandTopic(channelId);
        const envelope = {
          source: "socket",
          channelId,
          at: new Date().toISOString(),
          command,
        };

        await publish(topic, envelope);                    // MQTT → device
        io.to(channelId).emit("device:command", envelope); // echo to room
      } catch (e) {
        console.error("socket device:command error:", e?.message || e);
      }
    });

    socket.on("disconnect", () => {
      // optional: cleanup/logging
    });
  });

  return io;
};

export { io };
