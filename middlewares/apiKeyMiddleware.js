import User from "../models/User.js";

export const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey =
      req.headers["x-api-key"] ||
      req.query.apiKey ||
      req.body.apiKey;

    if (!apiKey) {
      return res.status(401).json({ message: "API key is required" });
    }

    const user = await User.findOne({ apiKey }).select("-password");
    if (!user) {
      return res.status(403).json({ message: "Invalid API key" });
    }

    // Attach user for downstream access
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Server Error", error: err.message });
  }
};
