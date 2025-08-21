import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  changeUserPassword,
  changeUserRole,
  getUsersByRole,
  getUserStats,
} from "../controllers/userController.js";

const router = express.Router();

// Admin and consultant routes
router.get("/", protect, roleMiddleware(["admin", "consultant"]), getAllUsers);
router.get("/stats", protect, roleMiddleware(["admin", "consultant"]), getUserStats);
router.get("/role/:role", protect, roleMiddleware(["admin", "consultant"]), getUsersByRole);

// Admin-only user creation
router.post("/", protect, roleMiddleware(["admin"]), createUser);

// Get or update your own profile
router
  .route("/me")
  .get(protect, getUserById)
  .put(protect, updateUser);

// Admin-only routes for managing specific users
router.put("/:id", protect, roleMiddleware(["admin"]), updateUser);
router.delete("/:id", protect, roleMiddleware(["admin"]), deleteUser);

// Admin-only password management routes
router.put("/:userId/reset-password", protect, roleMiddleware(["admin"]), resetUserPassword);
router.put("/:id/password", protect, roleMiddleware(["admin"]), changeUserPassword);

// Admin-only role management
router.put("/:userId/role", protect, roleMiddleware(["admin"]), changeUserRole);

export default router;
