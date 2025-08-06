import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});

export const roleCheck = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error("Access Denied");
  }
  next();
};


export const verifyApiKey = async (req, res, next) => {
  try {
    // API key can come from headers or query or body
    const apiKey =
      req.headers["x-api-key"] ||
      req.query.apiKey ||
      req.body.apiKey;

    if (!apiKey) {
      return res.status(401).json({ message: "API key is required" });
    }

    const user = await User.findOne({ apiKey });
    if (!user) {
      return res.status(403).json({ message: "Invalid API key" });
    }

    // Attach user to request for downstream access
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};