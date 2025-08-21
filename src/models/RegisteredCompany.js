import mongoose from "mongoose";

const registeredCompanySchema = new mongoose.Schema(
  {
    companyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      unique: true 
    },
    companyName: { 
      type: String, 
      required: true 
    },
    websiteURL: { 
      type: String 
    },
    registrationId: { 
      type: String 
    },
    industry: {
      type: String,
      enum: ['technology', 'healthcare', 'finance', 'education', 'manufacturing', 'retail', 'consulting', 'marketing', 'real-estate', 'other']
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    description: {
      type: String,
      maxlength: 1000
    },
    contactEmail: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    contactPhone: {
      type: String
    },
    address: {
      type: String
    },
    city: {
      type: String
    },
    country: {
      type: String
    },
    // Verification status for admin workflow
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    recruiterName: {
      type: String
    },
    documents: {
      type: [String],
      default: []
    },
    // Admin review fields
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    },
    verificationLevel: {
      type: String,
      enum: ['basic', 'verified', 'premium'],
      default: 'basic'
    },
    allowedJobPostings: {
      type: Number,
      default: 5 // Basic companies can post 5 jobs
    },
    companyType: {
      type: String,
      enum: ['startup', 'enterprise', 'sme', 'consulting', 'agency'],
      default: 'startup'
    },
    recruiterPermissions: {
      canPostJobs: { type: Boolean, default: false },
      canViewApplications: { type: Boolean, default: false },
      canManageJobs: { type: Boolean, default: false },
      canDownloadResumes: { type: Boolean, default: false }
    },
    complianceChecks: {
      documentsVerified: { type: Boolean, default: false },
      contactVerified: { type: Boolean, default: false },
      websiteVerified: { type: Boolean, default: false },
      businessRegistrationVerified: { type: Boolean, default: false }
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    jobPostingQuota: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 5 },
      resetDate: { type: Date, default: Date.now }
    }
  },
  { timestamps: true }
);

export default mongoose.model("RegisteredCompany", registeredCompanySchema); 