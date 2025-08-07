import { Server } from "socket.io";

let io;

/**
 * Initialize Socket.IO on an existing HTTP server.
 * Allows all origins.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET","POST","PUT","DELETE","OPTIONS"],
      credentials: false
    }
  });

  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);

    socket.on("subscribe", (channelId) => {
      socket.join(channelId);
    });

    socket.on("unsubscribe", (channelId) => {
      socket.leave(channelId);
    });
  });

  return io;
};

export { io };
