import mongoose from "mongoose";

const verificationRuleSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["jobseeker", "recruiter", "consultant", "admin"],
    required: true
  },

  requiredDocuments: [{
    documentType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentType",
      required: true
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    priority: {
      type: Number,
      default: 1 // 1 = high priority, 2 = medium, 3 = low
    },
    helpText: {
      type: String,
      trim: true
    },
    examples: [String], // Example file names or descriptions
    alternativeDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentType"
    }] // Alternative documents that can be submitted instead
  }],

  minimumRequired: {
    type: Number,
    default: 1 // Minimum number of documents required for verification
  },

  autoApproveThreshold: {
    type: Number,
    default: null // If set, auto-approve when this many docs are approved
  },

  verificationMessage: {
    pending: {
      type: String,
      default: "Please upload the required documents for verification."
    },
    inProgress: {
      type: String,
      default: "Your documents are being reviewed. This may take 1-3 business days."
    },
    verified: {
      type: String,
      default: "Your account has been successfully verified!"
    },
    rejected: {
      type: String,
      default: "Some documents were rejected. Please review and resubmit."
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, {
  timestamps: true
});

// Ensure only one active rule per role
verificationRuleSchema.index({ role: 1, isActive: 1 }, { unique: true });

const VerificationRule = mongoose.model("VerificationRule", verificationRuleSchema);
export default VerificationRule; 