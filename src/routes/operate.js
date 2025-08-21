import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { handleOperation } from "../controllers/operateController.js";

const router = express.Router();

// All dynamic operations
router.post("/", protect, handleOperation);

export default router;
