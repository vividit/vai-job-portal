import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import {
  getAllCompanies,
  createCompany,
  onboardCompany,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getRecruiterCompany,
  verifyCompany,
  getPendingCompanies,
  updateCompanyPermissions,
  getCompanyAnalytics,
  checkJobPostingQuota,
} from "../controllers/companyController.js";

const router = express.Router();

// Admin routes for company management
router.get("/", protect, roleMiddleware(["admin"]), getAllCompanies);
router.post("/", protect, roleMiddleware(["admin"]), createCompany);
router.get("/pending", protect, roleMiddleware(["admin"]), getPendingCompanies);
router.post("/:id/verify", protect, roleMiddleware(["admin"]), verifyCompany);
router.get("/:id", protect, roleMiddleware(["admin"]), getCompanyById);
router.put("/:id", protect, roleMiddleware(["admin"]), updateCompany);
router.delete("/:id", protect, roleMiddleware(["admin"]), deleteCompany);

// Additional admin routes
router.put("/:id/permissions", protect, roleMiddleware(["admin"]), updateCompanyPermissions);
router.get("/analytics", protect, roleMiddleware(["admin"]), getCompanyAnalytics);

// Recruiter routes
router.post("/onboard", protect, roleMiddleware(["recruiter"]), onboardCompany);
router.get("/me/company", protect, roleMiddleware(["recruiter"]), getRecruiterCompany);
router.get("/quota/check/:companyId", protect, checkJobPostingQuota);
router.get("/quota/check", protect, checkJobPostingQuota);

export default router; 