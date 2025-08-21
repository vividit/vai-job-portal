import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import {
  // Document Types
  getDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  
  // Verification Rules
  getVerificationRules,
  createVerificationRule,
  updateVerificationRule,
  deleteVerificationRule,
  
  // Utilities
  getConfigOptions,
  seedDefaultConfiguration
} from "../controllers/configController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// CONFIG OPTIONS (public for authenticated users)
router.get("/options", getConfigOptions);

// DOCUMENT TYPES MANAGEMENT (admin only)
router.get("/document-types", roleMiddleware(["admin"]), getDocumentTypes);
router.post("/document-types", roleMiddleware(["admin"]), createDocumentType);
router.put("/document-types/:typeId", roleMiddleware(["admin"]), updateDocumentType);
router.delete("/document-types/:typeId", roleMiddleware(["admin"]), deleteDocumentType);

// VERIFICATION RULES MANAGEMENT (admin only)
router.get("/verification-rules", roleMiddleware(["admin"]), getVerificationRules);
router.post("/verification-rules", roleMiddleware(["admin"]), createVerificationRule);
router.put("/verification-rules/:ruleId", roleMiddleware(["admin"]), updateVerificationRule);
router.delete("/verification-rules/:ruleId", roleMiddleware(["admin"]), deleteVerificationRule);

// SEED DEFAULT DATA (admin only)
router.post("/seed", roleMiddleware(["admin"]), seedDefaultConfiguration);

export default router; 