import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Optional helper to derive a canonical key for a field (used in UI/config only).
 * NOTE: This does NOT restrict your live sensor payload keys — those remain free-form.
 */
const slugify = (s) =>
  String(s ?? "")
    .trim() 
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "");

/** Field definition metadata (for UI/config; does not affect ingestion flexibility) */
const fieldSchema = new mongoose.Schema(
  {
    /** Human label the user sees (can contain spaces, punctuation, etc.) */
    name: { type: String, required: true, trim: true },

    /** Optional canonical key for UI mapping (auto-derived if not provided) */
    key: { type: String, trim: true },

    /** Display unit (e.g., °C, %, hPa, ppm) */
    unit: { type: String, trim: true },

    /** Suggested data type for charts/forms (does not restrict ingestion) */
    type: {
      type: String,
      enum: ["number", "string", "boolean", "json"],
      default: "number",
    },

    /** Optional display precision for number formatting */
    precision: { type: Number, min: 0, max: 10 },

    /** Optional UI hints */
    min: { type: Number },
    max: { type: Number },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const channelSchema = new mongoose.Schema(
  {
    /** 7-digit public ID used by devices & URLs */
    channel_id: { type: String, unique: true, required: true, index: true },

    /** Owner */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** Basic metadata */
    projectName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    /** Optional field definitions for UI; live payloads remain free-form */
    fields: { type: [fieldSchema], default: [] },

    /** MQTT configuration & telemetry health */
    mqtt: {
      enabled: { type: Boolean, default: true },
      /** Namespace/prefix for topics; defaults to env or "gridsense" */
      prefix: {
        type: String,
        default: () => process.env.MQTT_PREFIX || "gridsense",
      },
      qos: {
        telemetry: { type: Number, default: 1 },
        command: { type: Number, default: 1 },
      },
      retain: {
        telemetry: { type: Boolean, default: false },
        command: { type: Boolean, default: false },
      },
      lastConnectedAt: { type: Date }, // device connected (MQTT session)
      lastSeenAt: { type: Date }, // last telemetry/message time
    },

    /** Device identity for secure command path */
    device: {
      clientId: { type: String, trim: true },
      /** Store only a hash, never the raw secret; excluded by default in queries */
      secretHash: { type: String, select: false },
      lastAckAt: { type: Date },
    },

    /** Fast counters for dashboards */
    stats: {
      totalEntries: { type: Number, default: 0 },
      lastEntryAt: { type: Date },
      lastCommandAt: { type: Date },
    },

    /** Operational controls */
    status: {
      type: String,
      enum: ["active", "paused", "disabled"],
      default: "active",
      index: true,
    },

    /** Optional per-channel CORS allow-list (origin patterns) */
    allowedOrigins: { type: [String], default: [] },

    /** Optional per-channel rate limit (requests per minute); 0 = unlimited */
    rateLimitPerMin: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // Never expose the secret hash
        if (ret.device) delete ret.device.secretHash;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ---------- Virtual topic helpers (computed at runtime) ---------- */
channelSchema.virtual("topics").get(function () {
  const prefix = this.mqtt?.prefix || process.env.MQTT_PREFIX || "gridsense";
  const id = this.channel_id;
  return {
    telemetry: `${prefix}/devices/${id}/telemetry`,
    command: `${prefix}/devices/${id}/commands`,
    ack: `${prefix}/devices/${id}/ack`,
  };
});

/* ---------- Validation: ensure unique field keys (for UI) ---------- */
channelSchema.pre("validate", function (next) {
  if (!Array.isArray(this.fields) || this.fields.length === 0) return next();

  const seen = new Set();
  for (const f of this.fields) {
    if (!f.key) f.key = slugify(f.name);
    if (f.key) {
      if (seen.has(f.key)) {
        return next(new Error(`Duplicate field key: ${f.key}`));
      }
      seen.add(f.key);
    }
  }
  next();
});

/* ---------- Device secret helpers (hashing & verification) ---------- */
channelSchema.methods.setDeviceSecret = async function (plain) {
  const secret =
    plain || crypto.randomBytes(24).toString("base64url"); // return this to the user once
  const salt = await bcrypt.genSalt(10);
  this.device.secretHash = await bcrypt.hash(secret, salt);
  return secret;
};

channelSchema.methods.verifyDeviceSecret = async function (plain) {
  if (!this.device?.secretHash) return false;
  return bcrypt.compare(plain, this.device.secretHash);
};

/* ---------- Stats helpers ---------- */
channelSchema.methods.bumpEntryStats = function (date = new Date()) {
  this.stats.totalEntries = (this.stats.totalEntries || 0) + 1;
  this.stats.lastEntryAt = date;
};

channelSchema.methods.bumpCommandStats = function (date = new Date()) {
  this.stats.lastCommandAt = date;
};

channelSchema.methods.seenNow = function (date = new Date()) {
  this.mqtt.lastSeenAt = date;
};

/* ---------- Indexes for common queries ---------- */
channelSchema.index({ userId: 1, channel_id: 1 }, { unique: true });
channelSchema.index({ "stats.lastEntryAt": -1 });
channelSchema.index({ createdAt: -1 });

export default mongoose.model("Channel", channelSchema);
