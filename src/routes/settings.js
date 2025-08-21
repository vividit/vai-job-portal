import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import {
  getUserSettings,
  updateUserSettings,
  getSystemSettings,
  updateSystemSettings,
  getRolePermissionsEndpoint,
  getSystemStatus
} from "../controllers/settingsController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// User settings (all roles)
router.get("/user", getUserSettings);
router.put("/user", updateUserSettings);

// Role permissions (admin and consultant)
router.get("/permissions/:role", roleMiddleware(["admin", "consultant"]), getRolePermissionsEndpoint);

// System status (admin and consultant)
router.get("/system/status", roleMiddleware(["admin", "consultant"]), getSystemStatus);

// System settings (admin only)
router.get("/system", roleMiddleware(["admin"]), getSystemSettings);
router.put("/system", roleMiddleware(["admin"]), updateSystemSettings);

export default router; 