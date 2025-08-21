import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { uploadDocument as uploadDocumentMiddleware, handleDocumentUploadError } from "../middlewares/uploadMiddleware.js";
import {
  getRequiredDocuments,
  uploadDocument,
  getUserDocuments,
  downloadDocument,
  getPendingDocuments,
  verifyDocument,
  deleteDocument,
  getAllDocuments
} from "../controllers/documentController.js";
import Document from "../models/Document.js"; // Added import for Document model

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all documents (admin) or user documents (regular user)
router.get("/", getAllDocuments);

// Get required documents for current user's role
router.get("/required", getRequiredDocuments);

// Upload document (updated to work with documentTypeId)
router.post("/upload", uploadDocumentMiddleware, handleDocumentUploadError, uploadDocument);

// Get current user's documents
router.get("/my-documents", getUserDocuments);

// Download document (user's own or admin accessing any)
router.get("/download/:documentId", downloadDocument);

// Delete document (user's own or admin deleting any)
router.delete("/:documentId", deleteDocument);

// Document actions (approve/reject/archive)
router.patch("/:documentId/approve", roleMiddleware(["admin"]), async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        verificationStatus: "approved",
        verifiedBy: req.user._id,
        verifiedAt: new Date()
      },
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    res.json({ message: "Document approved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:documentId/reject", roleMiddleware(["admin"]), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { notes } = req.body;
    
    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        verificationStatus: "rejected",
        verificationNotes: notes || "",
        verifiedBy: req.user._id,
        verifiedAt: new Date()
      },
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    res.json({ message: "Document rejected successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:documentId/archive", roleMiddleware(["admin"]), async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        verificationStatus: "archived",
        verifiedBy: req.user._id,
        verifiedAt: new Date()
      },
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    res.json({ message: "Document archived successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only routes for document verification
router.get("/pending", roleMiddleware(["admin"]), getPendingDocuments);
router.put("/verify/:documentId", roleMiddleware(["admin"]), verifyDocument);

export default router; 