// server.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import app from "./app.js";
import { initSocket } from "./socket/socketServer.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/role_api";

// 1. Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    // 2. Create HTTP server from Express app
    const server = http.createServer(app);

    // 3. Initialize Socket.IO on that server
    const io = initSocket(server);

    // (Optional) make io available on req.app.get("io") in your routes/controllers
    app.set("io", io);

    // 4. Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
