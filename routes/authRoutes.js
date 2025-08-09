// routes/authRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  logout,
  rotateApiKey,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/jwtProtect.js";

const router = express.Router();


// Public (no API key, no JWT)
router.post("/register", registerUser);
router.post("/login", loginUser);

// Private (JWT required)
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.post("/rotate-api-key", protect, rotateApiKey);
router.patch("/profile", protect, updateProfile);
router.patch("/change-password", protect, changePassword);

export default router;
