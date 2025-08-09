// controllers/authController.js
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* ============================================================================
 * Utility helpers (pure, testable)
 * ========================================================================== */

/** Fast string check */
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

/** Normalize registration/login body */
const normalizeAuthInput = ({ name, email, password, role, username }) => ({
  name: isNonEmptyString(name) ? name.trim() : "",
  email: isNonEmptyString(email) ? email.trim().toLowerCase() : "",
  password: isNonEmptyString(password) ? password : "",
  role: isNonEmptyString(role) ? role : undefined,
  username: isNonEmptyString(username) ? username.trim().toLowerCase() : undefined,
});

/** Create JWT (7 days) */
const signToken = (user) => {
  const payload = { sub: String(user._id), role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/** Convert a mongoose user doc to public JSON (no secrets) */
const toPublicUser = (userDoc) => {
  const u = userDoc.toObject ? userDoc.toObject() : userDoc;
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

/** Parse duplicate key errors to precise, friendly messages */
const parseDuplicateKey = (err) => {
  const msg = String(err?.message || "");
  if (msg.includes("email_1") || msg.toLowerCase().includes("email")) return "Email already in use";
  if (msg.includes("username_1") || msg.toLowerCase().includes("username")) return "Username already in use";
  if (msg.includes("apiKey_1") || msg.toLowerCase().includes("apikey")) return "API key conflict; please retry";
  return "Duplicate key";
};

/** Quick password sanity checks (adjust to your policy) */
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
 * Body: { name, email, password, role?, username? }
 * Complexity: O(1) – single indexed lookups + single insert.
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, username } = normalizeAuthInput(req.body);

  // 1) Required fields
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  // 2) Password policy
  const pwdErr = validatePassword(password);
  if (pwdErr) return res.status(400).json({ message: pwdErr });

  // 3) Preflight O(1) existence checks on indexed fields
  const [emailExists, usernameExists] = await Promise.all([
    User.findOne({ email }).select("_id").lean(),
    username ? User.findOne({ username }).select("_id").lean() : Promise.resolve(null),
  ]);

  if (emailExists) return res.status(409).json({ message: "Email already in use" });
  if (username && usernameExists) return res.status(409).json({ message: "Username already in use" });

  // 4) Create user (pre-save hook hashes password)
  try {
    const doc = { name, email, password, provider: "local" };
    if (role) doc.role = role;
    if (username) doc.username = username;

    const user = await User.create(doc);
    const token = signToken(user);

    return res.status(201).json({
      user: toPublicUser(user),
      token,
    });
  } catch (err) {
    // Handle race on unique constraints (E11000)
    if (err?.code === 11000) {
      return res.status(409).json({ message: parseDuplicateKey(err) });
    }
    return res.status(500).json({ message: "Failed to register user" });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Complexity: O(1) – single indexed lookup + one updateOne.
 */
export const loginUser = asyncHandler(async (req, res) => {
  const email = isNonEmptyString(req.body.email) ? req.body.email.trim().toLowerCase() : "";
  const password = isNonEmptyString(req.body.password) ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // fetch with password (select:false in schema)
  const user = await User.findOne({ email })
    .select("+password name email username role status apiKey provider lastLoginAt createdAt updatedAt")
    .exec();

  const invalidMsg = "Invalid email or password";
  if (!user) return res.status(401).json({ message: invalidMsg });
  if (user.status !== "active") return res.status(403).json({ message: "Account is not active" });

  const ok = await user.matchPassword(password);
  if (!ok) return res.status(401).json({ message: invalidMsg });

  // update lastLoginAt without loading full doc back into memory
  void User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).exec();

  const token = signToken(user);
  return res.status(200).json({
    user: toPublicUser(user),
    token,
  });
});

/**
 * GET /api/auth/me
 * Requires a JWT middleware (protect) that sets req.user = { _id, ... }
 * Complexity: O(1)
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
 * Stateless JWTs are cleared client-side. This endpoint is semantic.
 * Complexity: O(1)
 */
export const logout = asyncHandler(async (_req, res) => {
  return res.status(200).json({ message: "Logged out" });
});

/**
 * POST /api/auth/rotate-api-key
 * Rotates the user’s API key securely.
 * Complexity: O(1)
 */
export const rotateApiKey = asyncHandler(async (req, res) => {
  const u = await User.findById(req.user._id).exec();
  if (!u) return res.status(404).json({ message: "User not found" });

  const newKey = await u.rotateApiKey();
  return res.status(200).json({ apiKey: newKey });
});

/**
 * PATCH /api/auth/profile
 * Optional: update profile fields (name, username). Email change could be added with re-verify flow.
 * Complexity: O(1)
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const id = req.user?._id;
  if (!id) return res.status(401).json({ message: "Not authenticated" });

  const name = isNonEmptyString(req.body.name) ? req.body.name.trim() : undefined;
  const username = isNonEmptyString(req.body.username) ? req.body.username.trim().toLowerCase() : undefined;

  try {
    // If username provided, ensure not taken by someone else
    if (username) {
      const exists = await User.findOne({ username, _id: { $ne: id } }).select("_id").lean();
      if (exists) return res.status(409).json({ message: "Username already in use" });
    }

    const update = {};
    if (name !== undefined) update.name = name;
    if (username !== undefined) update.username = username;

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
