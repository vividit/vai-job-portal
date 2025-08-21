import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const educationSchema = new mongoose.Schema({
  level: String, // e.g., "B.Tech", "XII"
  institute: String,
  year: String,
  mode: String,
}, { _id: false });

const employmentSchema = new mongoose.Schema({
  title: String,
  company: String,
  from: String,
  to: String,
  description: String,
  noticePeriod: String,
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title: String,
  summary: String,
  link: String,
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true }, // optional for OAuth
    password: { type: String }, // optional if OAuth
    oauthProvider: { type: String, enum: ["google", "github", null], default: null },
    oauthId: { type: String, unique: true, sparse: true },

    role: {
      type: String,
      enum: ["jobseeker", "recruiter", "consultant", "admin"],
      default: "jobseeker"
    },

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active"
    },

    // Company ID for recruiters (links to registered-companies collection)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegisteredCompany"
    },

    // User settings (dynamic based on role)
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Document verification fields
    documentVerification: {
      isVerified: {
        type: Boolean,
        default: false
      },
      
      verificationStatus: {
        type: String,
        enum: ["pending", "in_progress", "verified", "rejected"],
        default: "pending"
      },
      
      // Required documents are now determined dynamically from VerificationRule model
      // This field is kept for backward compatibility but not actively used
      
      verificationDate: Date,
      
      verificationNotes: String,
      
      lastDocumentUpdate: {
        type: Date,
        default: Date.now
      }
    },

    profile: {
      phone: String,
      location: String,
      experience: String, // e.g., "0 Year 6 Months"
      ctc: String, // e.g., ₹ 6,00,000
      noticePeriod: String, // e.g., "1 Month"
      dob: String,
      gender: String,
      maritalStatus: String,
      resumeUrl: String,

      resumeHeadline: String,
      summary: String,
      skills: [String],

      education: [educationSchema],
      employment: [employmentSchema],
      projects: [projectSchema],

      links: {
        linkedin: String,
        github: String,
        portfolio: String,
      },

      accomplishments: {
        certifications: [String],
        presentations: [String],
        publications: [String],
        patents: [String],
      },

      preferred: {
        location: [String],
        jobType: [String],
        shift: String,
        industry: String,
        department: String,
      }
    }
  },
  { timestamps: true }
);

// 🔐 Hash password before save (for local login)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔍 Compare input password with DB
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
