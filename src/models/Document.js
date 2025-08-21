import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  documentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DocumentType",
    required: true
  },

  fileName: {
    type: String,
    required: true
  },

  originalName: {
    type: String,
    required: true
  },

  filePath: {
    type: String,
    required: true
  },

  fileSize: {
    type: Number,
    required: true
  },

  mimeType: {
    type: String,
    required: true
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected", "archived"],
    default: "pending"
  },

  verificationNotes: {
    type: String,
    default: ""
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // Admin who verified
  },

  verifiedAt: {
    type: Date
  },

  expiryDate: {
    type: Date // For documents that expire
  },

  isRequired: {
    type: Boolean,
    default: true
  },

  metadata: {
    documentNumber: String,
    issuingAuthority: String,
    issueDate: Date,
    description: String,
    tags: [String]
  }

}, {
  timestamps: true
});

// Index for efficient queries
documentSchema.index({ userId: 1, documentType: 1 });
documentSchema.index({ verificationStatus: 1 });

const Document = mongoose.model("Document", documentSchema);
export default Document; 