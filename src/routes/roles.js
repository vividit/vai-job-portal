import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";

const router = express.Router();

// Admin-only routes for role management
router.get("/", protect, roleMiddleware(["admin"]), getAllRoles);
router.post("/", protect, roleMiddleware(["admin"]), createRole);
router.put("/:id", protect, roleMiddleware(["admin"]), updateRole);
router.delete("/:id", protect, roleMiddleware(["admin"]), deleteRole);

export default router; 