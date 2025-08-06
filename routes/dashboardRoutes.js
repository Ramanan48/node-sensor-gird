import express from "express";
import { userDashboard, superAdminDashboard } from "../controllers/dashboardController.js";
import { protect, roleCheck } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/user", protect, roleCheck(["user", "superadmin"]), userDashboard);
router.get("/superadmin", protect, roleCheck(["superadmin"]), superAdminDashboard);

export default router;
