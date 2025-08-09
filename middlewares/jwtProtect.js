// middlewares/jwtProtect.js
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  // Fail fast if misconfigured
  // eslint-disable-next-line no-console
  console.error("[FATAL] JWT_SECRET is not configured");
  throw new Error("JWT_SECRET is required");
}

/**
 * Extract Bearer token from Authorization header.
 */
function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

/**
 * Protect: require a valid JWT and attach the user to req.user
 * - Expects Authorization: Bearer <token>
 * - Ensures the account is active
 */
export const protect = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Not authorized: missing Bearer token" });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET); // { sub, role, iat, exp, ... }
  } catch (err) {
    return res.status(401).json({ message: "Not authorized: invalid or expired token" });
  }

  const userId = payload.sub || payload.id;
  const user = await User.findById(userId)
    .select("name email username role status apiKey provider createdAt updatedAt lastLoginAt")
    .lean();

  if (!user) {
    return res.status(401).json({ message: "Not authorized: user no longer exists" });
  }
  if (user.status !== "active") {
    return res.status(403).json({ message: "Account is not active" });
  }

  req.user = user; // safe subset (no password)
  next();
});

/**
 * Role gate: require one of the roles. Use after `protect`.
 *   router.get("/admin-only", protect, requireRoles("superadmin"), handler);
 */
export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  next();
};

// Backward-compatible alias if you prefer previous naming
export const roleCheck = requireRoles;
