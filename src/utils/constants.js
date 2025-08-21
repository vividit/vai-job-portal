// Remove hardcoded document verification constants
// These are now stored dynamically in DocumentType and VerificationRule models

// Keep only general constants that are still needed
export const USER_ROLES = {
  JOBSEEKER: "jobseeker",
  RECRUITER: "recruiter", 
  CONSULTANT: "consultant",
  ADMIN: "admin"
};

export const USER_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled"
};

export const VERIFICATION_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  VERIFIED: "verified", 
  REJECTED: "rejected"
};

export const DOCUMENT_VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
};

// Document categories (used in DocumentType model)
export const DOCUMENT_CATEGORIES = {
  IDENTITY: "identity",
  PROFESSIONAL: "professional", 
  BUSINESS: "business",
  EDUCATION: "education",
  ADDRESS: "address",
  OTHER: "other"
};

// Metadata field types (used in DocumentType model)
export const METADATA_FIELD_TYPES = {
  TEXT: "text",
  NUMBER: "number",
  DATE: "date", 
  SELECT: "select",
  TEXTAREA: "textarea"
};
