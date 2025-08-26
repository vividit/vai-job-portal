import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  oauthId: String,
  oauthProvider: String, // 'google', 'github', etc.
  role: {
    type: String,
    enum: ['job_seeker', 'recruiter', 'consultant', 'admin'],
    default: 'job_seeker'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  profile: {
    phone: String,
    location: String,
    experience: String,
    ctc: String,
    noticePeriod: String,
    dob: Date,
    gender: String,
    maritalStatus: String,
    resumeHeadline: String,
    summary: String,
    skills: [String],
    education: [mongoose.Schema.Types.Mixed],
    employment: [mongoose.Schema.Types.Mixed],
    projects: [mongoose.Schema.Types.Mixed],
    links: {
      linkedin: String,
      github: String,
      portfolio: String
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);