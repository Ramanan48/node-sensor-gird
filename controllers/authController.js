// controllers/authController.js
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* ============================================================================
 * Invariants
 * ========================================================================== */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("[FATAL] JWT_SECRET is not configured");
  throw new Error("JWT_SECRET is required");
}

/* ============================================================================
 * Pure Utilities (testable)
 * ========================================================================== */

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

/** Normalize incoming body strings (NO username here) */
const normalizeAuthInput = ({ name, email, password, role }) => ({
  name: isNonEmptyString(name) ? name.trim() : "",
  email: isNonEmptyString(email) ? email.trim().toLowerCase() : "",
  password: isNonEmptyString(password) ? password : "",
  role: isNonEmptyString(role) ? role : undefined,
});

/** Minimal username sanitizer: lowercase, a–z0–9 only, length cap */
const sanitizeToUsername = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

/**
 * Allocate a unique username derived from a seed (name/email local-part).
 * Strategy:
 *  1) try base
 *  2) try base + 4-digit random for a few attempts
 *  3) fallback base + count+1
 * All O(1) expected with indexed username.
 */
const ensureUniqueUsername = async (seed) => {
  const base = sanitizeToUsername(seed) || "user";
  let candidate = base;

  if (!(await User.exists({ username: candidate }))) return candidate;

  for (let i = 0; i < 5; i++) {
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    candidate = `${base}${rand}`.slice(0, 30);
    if (!(await User.exists({ username: candidate }))) return candidate;
  }

  const count = await User.countDocuments({ username: new RegExp(`^${base}`, "i") });
  return `${base}${count + 1}`.slice(0, 30);
};

/** JWT (7 days) */
const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: "7d" });

/** Project a user doc to public JSON */
const toPublicUser = (userDoc) => {
  const u = userDoc?.toObject ? userDoc.toObject() : userDoc;
  return {
    _id: String(u._id),
    name: u.name,
    email: u.email,
    username: u.username ?? null,
    role: u.role,
    status: u.status,
    apiKey: u.apiKey,
    provider: u.provider ?? "local",
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLoginAt: u.lastLoginAt ?? null,
  };
};

/** Duplicate-key friendly message */
const parseDuplicateKey = (err) => {
  const msg = String(err?.message || "");
  if (msg.includes("email_1") || msg.toLowerCase().includes("email")) return "Email already in use";
  if (msg.includes("username_1") || msg.toLowerCase().includes("username")) return "Username already in use";
  if (msg.includes("apiKey_1") || msg.toLowerCase().includes("apikey")) return "API key conflict; please retry";
  return "Duplicate key";
};

/** Basic password policy */
const validatePassword = (pwd) => {
  if (pwd.length < 6) return "Password must be at least 6 characters";
  if (pwd.length > 128) return "Password too long";
  return null;
};

/* ============================================================================
 * Controllers
 * ========================================================================== */

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 * O(1) expected: indexed lookups; one insert.
 * - Ignores any username in body; always auto-generates.
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = normalizeAuthInput(req.body);

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const pwdErr = validatePassword(password);
  if (pwdErr) return res.status(400).json({ message: pwdErr });

  // 1) email must be unique
  const emailExists = await User.findOne({ email }).select("_id").lean();
  if (emailExists) return res.status(409).json({ message: "Email already in use" });

  // 2) always auto-generate a unique username
  const seed = name || email.split("@")[0];
  let allocatedUsername = await ensureUniqueUsername(seed);

  // 3) create user (with small retry if username collides mid-air)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const doc = {
        name,
        email,
        password,           // hashed by model pre-save
        provider: "local",
        username: allocatedUsername,
      };
      if (role) doc.role = role;

      const user = await User.create(doc);
      const token = signToken(user);
      return res.status(201).json({ user: toPublicUser(user), token });
    } catch (err) {
      if (err?.code === 11000 && String(err?.message || "").toLowerCase().includes("username")) {
        // regenerate and retry
        allocatedUsername = await ensureUniqueUsername(seed);
        continue;
      }
      if (err?.code === 11000) {
        return res.status(409).json({ message: parseDuplicateKey(err) });
      }
      return res.status(500).json({ message: "Failed to register user" });
    }
  }

  // if we somehow exhausted retries:
  return res.status(500).json({ message: "Failed to allocate a unique username" });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * O(1): single lookup + updateOne for lastLoginAt
 */
export const loginUser = asyncHandler(async (req, res) => {
  const email = isNonEmptyString(req.body.email) ? req.body.email.trim().toLowerCase() : "";
  const password = isNonEmptyString(req.body.password) ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email })
    .select("+password name email username role status apiKey provider lastLoginAt createdAt updatedAt")
    .exec();

  const invalidMsg = "Invalid email or password";
  if (!user) return res.status(401).json({ message: invalidMsg });
  if (user.status !== "active") return res.status(403).json({ message: "Account is not active" });

  const ok = await user.matchPassword(password);
  if (!ok) return res.status(401).json({ message: invalidMsg });

  void User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).exec();

  const token = signToken(user);
  return res.status(200).json({ user: toPublicUser(user), token });
});

/**
 * GET /api/auth/me
 * Requires protect middleware to set req.user
 */
export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  const user = await User.findById(req.user._id)
    .select("name email username role status apiKey provider createdAt updatedAt lastLoginAt")
    .lean();

  if (!user) return res.status(404).json({ message: "User not found" });
  return res.status(200).json({ user });
});

/**
 * POST /api/auth/logout
 * Stateless JWT — client discards token
 */
export const logout = asyncHandler(async (_req, res) => {
  return res.status(200).json({ message: "Logged out" });
});

/**
 * POST /api/auth/rotate-api-key
 * O(1)
 */
export const rotateApiKey = asyncHandler(async (req, res) => {
  const u = await User.findById(req.user._id).exec();
  if (!u) return res.status(404).json({ message: "User not found" });

  const newKey = await u.rotateApiKey();
  return res.status(200).json({ apiKey: newKey });
});

/**
 * PATCH /api/auth/profile
 * Body: { name? }
 * Username is immutable because it is auto-generated by the system.
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const id = req.user?._id;
  if (!id) return res.status(401).json({ message: "Not authenticated" });

  const name = isNonEmptyString(req.body.name) ? req.body.name.trim() : undefined;

  // Explicitly disallow username changes
  if (typeof req.body.username !== "undefined") {
    return res.status(400).json({ message: "Username cannot be changed" });
  }

  const update = {};
  if (name !== undefined) update.name = name;

  try {
    const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
      .select("name email username role status apiKey provider createdAt updatedAt lastLoginAt")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: parseDuplicateKey(err) });
    }
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

/**
 * PATCH /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * O(1)
 */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const currentPassword = isNonEmptyString(req.body.currentPassword) ? req.body.currentPassword : "";
  const newPassword = isNonEmptyString(req.body.newPassword) ? req.body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new passwords are required" });
  }
  const pwdErr = validatePassword(newPassword);
  if (pwdErr) return res.status(400).json({ message: pwdErr });

  const user = await User.findById(userId).select("+password").exec();
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await user.matchPassword(currentPassword);
  if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

  user.password = newPassword; // hashed by pre-save hook
  await user.save();

  return res.status(200).json({ message: "Password updated" });
});
