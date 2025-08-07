import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // secure in production
    }
  });

  io.on("connection", (socket) => {
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
