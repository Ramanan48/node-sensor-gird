// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },

    email:    {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Optional username. We enforce uniqueness ONLY when it's a non-empty string (partial unique index below).
    username: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Never return the password by default
    password: { type: String, required: true, select: false },

    role:     { type: String, enum: ["superadmin", "user"], default: "user" },

    // Each user gets a unique API key
    apiKey:   { type: String, default: () => uuidv4(), unique: true },

    // Optional convenience fields
    status:         { type: String, enum: ["active", "suspended"], default: "active" },
    lastLoginAt:    { type: Date },
    provider:       { type: String, default: "local" }, // local / oauth provider id, etc.
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ----------------------------- Indexes ----------------------------- */
// Email must be unique
userSchema.index({ email: 1 }, { unique: true });

// API key must be unique
userSchema.index({ apiKey: 1 }, { unique: true });

// Username is unique ONLY when it exists and is a non-empty string
userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $exists: true, $type: "string", $ne: "" } } }
);

/* ------------------------- Hooks & Methods ------------------------- */
// Normalize email/username on set
userSchema.path("email").set((v) => (typeof v === "string" ? v.trim().toLowerCase() : v));
userSchema.path("username").set((v) => (typeof v === "string" ? v.trim().toLowerCase() : v));

// Hash password before save if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a candidate password to the hashed one
userSchema.methods.matchPassword = function (enteredPassword) {
  // 'password' is select:false; make sure you selected it when calling (e.g., .select("+password"))
  return bcrypt.compare(enteredPassword, this.password);
};

// Rotate the user's API key (e.g., on demand)
userSchema.methods.rotateApiKey = async function () {
  this.apiKey = uuidv4();
  await this.save();
  return this.apiKey;
};

export default mongoose.models.User || mongoose.model("User", userSchema);
