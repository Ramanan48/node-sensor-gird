import mongoose from "mongoose";

const sensorDataSchema = new mongoose.Schema(
  {
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    data: { type: Map, of: Number }, // e.g., { temperature: 32.5, humidity: 80 }
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("SensorData", sensorDataSchema);
