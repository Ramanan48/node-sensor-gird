// socket/socketServer.js
import { Server } from "socket.io";

let io;

/**
 * Initialize Socket.IO on the provided HTTP server.
 * Allows all origins.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"] }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("subscribe", (channelId) => socket.join(channelId));
    socket.on("unsubscribe", (channelId) => socket.leave(channelId));
  });

  return io;
};

/**
 * Once initSocket() has been called, you can import `io` to broadcast.
 */
export { io };
