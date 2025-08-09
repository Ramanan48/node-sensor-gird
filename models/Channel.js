import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },  // e.g. temperature
  unit: { type: String },                  // optional
});

const channelSchema = new mongoose.Schema(
  {
    channel_id: { type: String, unique: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    projectName: { type: String, required: true },
    description: { type: String },
    fields: [fieldSchema], // dynamic array of fields
  },
  { timestamps: true }
);

export default mongoose.model("Channel", channelSchema);