// index.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import app from "./app.js";
import { initSocket } from "./socket/socketServer.js";
import { startMqtt, setSocket } from "./services/mqttClient.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/role_api";

mongoose.connect(MONGO_URI).then(() => {
  console.log("✅ MongoDB Connected");

  const server = http.createServer(app);
  const io = initSocket(server);
  app.set("io", io);
  setSocket(io);

  // Start MQTT after server/io is ready
  startMqtt();

  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch((err) => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});
