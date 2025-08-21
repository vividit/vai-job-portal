import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import {
  applyToExternalJob,
  saveJob,
  getSavedJobs,
  removeSavedJob,
  getExternalApplicationStatus,
  applyWithAgent,
  bulkApplyToJobs
} from "../controllers/externalJobController.js";

const router = express.Router();

// Job saving functionality
router.post("/:jobId/save", protect, saveJob);
router.get("/saved", protect, getSavedJobs);
router.delete("/:jobId/saved", protect, removeSavedJob);

// External job applications
router.post("/:jobId/apply", protect, applyToExternalJob);
router.get("/applications/:applicationId/status", protect, getExternalApplicationStatus);

// AI Agent functionality
router.post("/:jobId/apply-with-agent", protect, applyWithAgent);
router.post("/bulk-apply", protect, bulkApplyToJobs);

export default router;
