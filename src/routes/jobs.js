import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { uploadResume, handleUploadError } from "../middlewares/uploadMiddleware.js";
import {
  createJob,
  listJobs,
  getJobById,
  applyToJob,
  getMyApplications,
  getMyJobs,
  getJobApplications,
  updateJobStatus,
  deleteJob,
  updateApplicationStatus,
  downloadResume,
  getJobStats,
  getAdminAllJobs
} from "../controllers/jobController.js";

const router = express.Router();

// Public routes
router.get("/", listJobs);                               // public - browse all jobs
router.get("/stats", protect, getJobStats);              // protected - get job statistics
router.get("/admin-all", protect, getAdminAllJobs);      // admin - get all jobs including pending/expired
router.get("/:id", getJobById);                          // public - get specific job

// Job seeker routes
router.post("/:id/apply", protect, uploadResume, handleUploadError, applyToJob);          // jobseeker only - apply to job
router.get("/me/applications", protect, getMyApplications); // current user's applications

// Recruiter routes
router.post("/create", protect, createJob);              // recruiter only - create job
router.get("/me/jobs", protect, getMyJobs);              // recruiter - get my posted jobs
router.get("/:id/applications", protect, getJobApplications); // recruiter - get job applications
router.put("/:id/status", protect, updateJobStatus);     // recruiter - update job status
router.delete("/:id", protect, deleteJob);               // recruiter - delete job
router.put("/applications/:id/status", protect, updateApplicationStatus); // recruiter - update application status
router.get("/applications/:id/resume", protect, downloadResume); // recruiter - download application resume

export default router;
