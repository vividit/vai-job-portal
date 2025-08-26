import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    company: { type: String, required: true },
    location: String,
    
    // Updated employment type structure
    employmentType: {
      fullTime: { type: Number, default: 0 },
      partTime: { type: Number, default: 0 },
      contract: { type: Number, default: 0 },
      internship: { type: Number, default: 0 },
      temporary: { type: Number, default: 0 },
      other: String
    },
    
    // Legacy type field for backward compatibility
    type: { type: String, enum: ["full-time", "part-time", "remote", "contract", "internship"], default: "full-time" },
    
    // Enhanced salary structure
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: "USD" },
      type: { type: String, enum: ["yearly", "monthly", "hourly", "daily"], default: "yearly" }
    },
    
    // Legacy salary field for backward compatibility
    salaryLegacy: String,
    
    experience: String, // e.g., "2-4 years", "Entry level", "Senior level"
    skills: [String], // Required skills
    department: String, // e.g., "Engineering", "Marketing", "Sales"
    
    // Enhanced source tracking
    source: { type: String, enum: ["internal", "crawled", "indeed", "linkedin", "remoteok", "wellfound", "naukri", "monster", "other"], default: "internal" },
    externalUrl: String,
    sourceUrl: String, // Original job posting URL from crawler
    crawledAt: { type: Date }, // When this job was crawled
    datePosted: { type: Date }, // Original posting date from source
    tags: [String], // Additional tags from crawler
    isActive: { type: Boolean, default: true }, // For crawler management
    
    // New fields for enhanced crawler data
    workType: { type: String, enum: ["onsite", "remote", "hybrid"], default: "onsite" },
    withEmploymentType: String, // Human-readable summary like "12 FTE, 8 Contract"
    currencySupported: [{ type: String, default: ["USD", "INR"] }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "RegisteredCompany" },
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["open", "closed", "draft"], default: "open" },
    maxApplications: { type: Number, default: 100 }, // Auto-close after this many applications
    applicationDeadline: { type: Date }, // Optional deadline
    applicationMethod: {
      type: String,
      enum: ["internal", "external", "hybrid"],
      default: "internal"
    },
    externalApplicationSettings: {
      autoApply: { type: Boolean, default: false },
      requiresLogin: { type: Boolean, default: true },
      applicationSteps: [String], // Steps required for external application
      estimatedTime: String, // e.g., "5 minutes"
    },
    linkedInJobId: String, // LinkedIn job posting ID for tracking
    jobBoardUrls: {
      indeed: String,
      linkedin: String,
      glassdoor: String,
      monster: String,
      zipRecruiter: String
    },
    applicationTracking: {
      totalApplications: { type: Number, default: 0 },
      externalApplications: { type: Number, default: 0 },
      internalApplications: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }
    },
    jobRequirements: {
      education: String,
      yearsOfExperience: Number,
      certifications: [String],
      languages: [String],
      workAuthorization: { type: Boolean, default: false }
    },
    benefits: {
      healthInsurance: Boolean,
      dentalInsurance: Boolean,
      retirement401k: Boolean,
      paidTimeOff: Boolean,
      workFromHome: Boolean,
      flexibleSchedule: Boolean,
      professionalDevelopment: Boolean
    },
    compensation: {
      salaryMin: Number,
      salaryMax: Number,
      currency: { type: String, default: "USD" },
      bonusEligible: Boolean,
      equityOffered: Boolean,
      benefits: [String]
    }
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
