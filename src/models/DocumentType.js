import mongoose from "mongoose";

const documentTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  displayName: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  category: {
    type: String,
    enum: ["identity", "professional", "business", "education", "address", "other"],
    default: "other"
  },

  allowedFileTypes: {
    type: [String],
    default: ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
  },

  maxFileSize: {
    type: Number,
    default: 10485760 // 10MB in bytes
  },

  hasExpiry: {
    type: Boolean,
    default: false
  },

  requiresMetadata: {
    metadataFields: [{
      fieldName: {
        type: String,
        required: true
      },
      fieldType: {
        type: String,
        enum: ["text", "number", "date", "select", "textarea"],
        default: "text"
      },
      label: {
        type: String,
        required: true
      },
      required: {
        type: Boolean,
        default: false
      },
      options: [String], // For select type
      placeholder: String,
      validation: {
        minLength: Number,
        maxLength: Number,
        pattern: String // regex pattern
      }
    }],
    default: []
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

  sortOrder: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

// Index for efficient queries
documentTypeSchema.index({ name: 1 });
documentTypeSchema.index({ category: 1, isActive: 1 });
documentTypeSchema.index({ sortOrder: 1 });

const DocumentType = mongoose.model("DocumentType", documentTypeSchema);
export default DocumentType; 