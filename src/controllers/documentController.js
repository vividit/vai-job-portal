import Document from "../models/Document.js";
import DocumentType from "../models/DocumentType.js";
import VerificationRule from "../models/VerificationRule.js";
import User from "../models/User.js";
import path from "path";
import fs from "fs";

// Get required documents for user role (dynamic from database)
export const getRequiredDocuments = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Get the verification rule for this role
    const verificationRule = await VerificationRule.findOne({ 
      role: userRole, 
      isActive: true 
    }).populate('requiredDocuments.documentType requiredDocuments.alternativeDocuments');

    if (!verificationRule) {
      return res.status(404).json({ 
        error: "No verification rules found for your role. Please contact support." 
      });
    }

    // Get user's current documents
    const userDocuments = await Document.find({ userId: req.user._id })
      .populate('documentType', 'name displayName');

    // Format response with document status
    const documentsWithStatus = verificationRule.requiredDocuments.map(reqDoc => {
      const userDoc = userDocuments.find(doc => 
        doc.documentType && doc.documentType._id.toString() === reqDoc.documentType._id.toString()
      );

      return {
        documentType: {
          _id: reqDoc.documentType._id,
          name: reqDoc.documentType.name,
          displayName: reqDoc.documentType.displayName,
          description: reqDoc.documentType.description,
          category: reqDoc.documentType.category,
          hasExpiry: reqDoc.documentType.hasExpiry,
          metadataFields: reqDoc.documentType.requiresMetadata?.metadataFields || [],
          allowedFileTypes: reqDoc.documentType.allowedFileTypes,
          maxFileSize: reqDoc.documentType.maxFileSize
        },
        isRequired: reqDoc.isRequired,
        priority: reqDoc.priority,
        helpText: reqDoc.helpText,
        examples: reqDoc.examples,
        alternativeDocuments: reqDoc.alternativeDocuments,
        userDocument: userDoc ? {
          _id: userDoc._id,
          originalName: userDoc.originalName,
          verificationStatus: userDoc.verificationStatus,
          uploadedAt: userDoc.createdAt,
          verificationNotes: userDoc.verificationNotes
        } : null
      };
    });

    res.json({ 
      requiredDocuments: documentsWithStatus,
      verificationRule: {
        minimumRequired: verificationRule.minimumRequired,
        verificationMessage: verificationRule.verificationMessage
      },
      userRole: userRole
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upload document (dynamic validation)
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { category, description } = req.body;
    
    // Create a simple document type for now (can be enhanced later)
    let documentType = await DocumentType.findOne({ name: category || 'General' });
    
    if (!documentType) {
      // Create a basic document type if it doesn't exist
      documentType = await DocumentType.create({
        name: category || 'General',
        displayName: category || 'General Document',
        category: category || 'General',
        description: description || '',
        allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        isActive: true,
        requiresMetadata: {
          metadataFields: []
        }
      });
    }

    // Check if document already exists for this user and type
    const existingDoc = await Document.findOne({ 
      userId: req.user._id, 
      documentType: documentType._id 
    });

    if (existingDoc) {
      // Delete old file if it exists
      if (fs.existsSync(existingDoc.filePath)) {
        fs.unlinkSync(existingDoc.filePath);
      }
      // Remove old document record
      await Document.findByIdAndDelete(existingDoc._id);
    }

    // Create new document record
    const document = await Document.create({
      userId: req.user._id,
      documentType: documentType._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      verificationStatus: "pending",
      metadata: {
        description: description || '',
        tags: []
      }
    });

    // Update user's document verification status
    await updateUserVerificationStatus(req.user._id);

    const populatedDoc = await Document.findById(document._id)
      .populate('documentType', 'name displayName')
      .populate('userId', 'name email role');

    // Transform to match frontend expectations
    const transformedDoc = {
      _id: populatedDoc._id,
      name: populatedDoc.documentType?.displayName || populatedDoc.documentType?.name || 'Unknown',
      originalName: populatedDoc.originalName,
      type: populatedDoc.documentType?.name || 'Unknown',
      size: populatedDoc.fileSize,
      uploadedBy: {
        _id: populatedDoc.userId._id,
        name: populatedDoc.userId.name,
        email: populatedDoc.userId.email,
        role: populatedDoc.userId.role
      },
      uploadedAt: populatedDoc.createdAt,
      status: populatedDoc.verificationStatus,
      category: populatedDoc.documentType?.category || 'General',
      description: populatedDoc.metadata?.description || '',
      tags: populatedDoc.metadata?.tags || [],
      url: `/api/documents/download/${populatedDoc._id}`,
      mimeType: populatedDoc.mimeType
    };

    res.status(201).json({ 
      message: "Document uploaded successfully", 
      document: transformedDoc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user's documents
export const getUserDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .populate('documentType', 'name displayName category')
      .select('-filePath') // Don't expose file path
      .sort({ createdAt: -1 });

    const user = await User.findById(req.user._id).select('documentVerification');

    res.json({ 
      documents,
      verificationStatus: user.documentVerification
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Download document
export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId)
      .populate('documentType', 'name displayName');
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions - user can download their own docs, admins can download any
    if (req.user.role !== "admin" && document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(document.filePath, document.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Get all pending documents for verification
export const getPendingDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, role } = req.query;
    
    let matchQuery = { verificationStatus: "pending" };
    
    const documents = await Document.find(matchQuery)
      .populate({
        path: "userId", 
        select: "name email role",
        match: role ? { role: role } : {}
      })
      .populate({
        path: "documentType",
        select: "name displayName category",
        match: category ? { category: category } : {}
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out documents where populated fields are null (due to match)
    const filteredDocuments = documents.filter(doc => doc.userId && doc.documentType);

    const total = await Document.countDocuments(matchQuery);

    res.json({ 
      documents: filteredDocuments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Verify document
export const verifyDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, notes } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid verification status" });
    }

    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        verificationStatus: status,
        verificationNotes: notes || "",
        verifiedBy: req.user._id,
        verifiedAt: new Date()
      },
      { new: true }
    ).populate("userId", "name email role")
     .populate("documentType", "name displayName");

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Update user's overall verification status
    await updateUserVerificationStatus(document.userId._id);

    res.json({ 
      message: `Document ${status} successfully`,
      document 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function to update user's overall verification status (dynamic)
const updateUserVerificationStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Get verification rule for user's role
    const verificationRule = await VerificationRule.findOne({ 
      role: user.role, 
      isActive: true 
    }).populate('requiredDocuments.documentType');

    if (!verificationRule) return;

    // Get user's documents
    const userDocuments = await Document.find({ userId });

    // Check how many required documents are approved
    let approvedRequiredDocs = 0;
    let totalRequiredDocs = 0;
    let hasAnyRejected = false;

    for (const reqDoc of verificationRule.requiredDocuments) {
      if (reqDoc.isRequired) {
        totalRequiredDocs++;
        
        const userDoc = userDocuments.find(doc => 
          doc.documentType.toString() === reqDoc.documentType._id.toString()
        );
        
        if (userDoc) {
          if (userDoc.verificationStatus === "approved") {
            approvedRequiredDocs++;
          } else if (userDoc.verificationStatus === "rejected") {
            hasAnyRejected = true;
          }
        }
      }
    }

    // Determine overall status
    let overallStatus = "pending";
    let isVerified = false;

    if (approvedRequiredDocs >= verificationRule.minimumRequired && 
        approvedRequiredDocs >= totalRequiredDocs) {
      overallStatus = "verified";
      isVerified = true;
    } else if (hasAnyRejected || userDocuments.length > 0) {
      overallStatus = "in_progress";
    }

    // Auto-approve if threshold is met
    if (verificationRule.autoApproveThreshold && 
        approvedRequiredDocs >= verificationRule.autoApproveThreshold) {
      overallStatus = "verified";
      isVerified = true;
    }

    await User.findByIdAndUpdate(userId, {
      "documentVerification.isVerified": isVerified,
      "documentVerification.verificationStatus": overallStatus,
      "documentVerification.verificationDate": isVerified ? new Date() : null,
      "documentVerification.lastDocumentUpdate": new Date()
    });

  } catch (err) {
    console.error("Error updating user verification status:", err);
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (req.user.role !== "admin" && document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Remove from database
    await Document.findByIdAndDelete(documentId);

    // Update user's overall verification status
    await updateUserVerificationStatus(document.userId);

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 

// Get all documents (admin) or user documents (regular user)
export const getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, category, search } = req.query;
    
    let matchQuery = {};
    
    // If not admin, only show user's own documents
    if (req.user.role !== "admin") {
      matchQuery.userId = req.user._id;
    }
    
    // Add status filter
    if (status && status !== 'all') {
      matchQuery.verificationStatus = status;
    }
    
    // Add category filter
    if (category && category !== 'all') {
      matchQuery['documentType.category'] = category;
    }
    
    // Add search filter
    if (search) {
      matchQuery.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { 'documentType.name': { $regex: search, $options: 'i' } },
        { 'documentType.category': { $regex: search, $options: 'i' } }
      ];
    }
    
    const documents = await Document.find(matchQuery)
      .populate({
        path: "userId", 
        select: "name email role"
      })
      .populate({
        path: "documentType",
        select: "name displayName category"
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Transform documents to match frontend expectations
    const transformedDocuments = documents.map(doc => ({
      _id: doc._id,
      name: doc.documentType?.displayName || doc.documentType?.name || 'Unknown',
      originalName: doc.originalName,
      type: doc.documentType?.name || 'Unknown',
      size: doc.fileSize,
      uploadedBy: {
        _id: doc.userId._id,
        name: doc.userId.name,
        email: doc.userId.email,
        role: doc.userId.role
      },
      uploadedAt: doc.createdAt,
      status: doc.verificationStatus,
      category: doc.documentType?.category || 'General',
      description: doc.metadata?.description || '',
      tags: doc.metadata?.tags || [],
      url: `/api/documents/download/${doc._id}`,
      mimeType: doc.mimeType
    }));

    const total = await Document.countDocuments(matchQuery);

    res.json({ 
      documents: transformedDocuments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 