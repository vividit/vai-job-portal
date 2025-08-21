import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  current: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  achievements: [String],
  skills: [String]
}, {
  timestamps: true
});

const educationSchema = new mongoose.Schema({
  institution: {
    type: String,
    required: true,
    trim: true
  },
  degree: {
    type: String,
    required: true,
    trim: true
  },
  fieldOfStudy: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  current: {
    type: Boolean,
    default: false
  },
  gpa: {
    type: String,
    trim: true
  },
  activities: [String],
  achievements: [String]
}, {
  timestamps: true
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  technologies: [String],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  ongoing: {
    type: Boolean,
    default: false
  },
  url: {
    type: String,
    trim: true
  },
  githubUrl: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    trim: true
  },
  teamSize: {
    type: Number
  },
  achievements: [String]
}, {
  timestamps: true
});

const certificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  issuer: {
    type: String,
    required: true,
    trim: true
  },
  issueDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date
  },
  credentialId: {
    type: String,
    trim: true
  },
  credentialUrl: {
    type: String,
    trim: true
  },
  skills: [String]
}, {
  timestamps: true
});

const userProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Basic Info
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  headline: {
    type: String,
    trim: true,
    maxlength: 220
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // Contact Info
  phone: {
    type: String,
    trim: true
  },
  location: {
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Professional Info
  experience: [experienceSchema],
  education: [educationSchema],
  projects: [projectSchema],
  certifications: [certificationSchema],
  
  // Skills & Preferences
  skills: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    yearsOfExperience: {
      type: Number,
      default: 0
    }
  }],
  
  languages: [{
    name: String,
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'fluent', 'native'],
      default: 'conversational'
    }
  }],
  
  // Job Preferences
  jobPreferences: {
    desiredRoles: [String],
    industries: [String],
    locations: [String],
    workType: [{
      type: String,
      enum: ['remote', 'onsite', 'hybrid']
    }],
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance']
    }],
    salaryRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    availability: {
      startDate: Date,
      noticePeriod: String
    },
    willingToRelocate: {
      type: Boolean,
      default: false
    },
    sponsorshipRequired: {
      type: Boolean,
      default: false
    }
  },
  
  // Media & Documents
  profilePicture: {
    type: String // URL to uploaded image
  },
  resume: {
    filename: String,
    url: String,
    uploadDate: Date
  },
  portfolio: {
    website: String,
    github: String,
    linkedin: String,
    behance: String,
    dribbble: String,
    other: [String]
  },
  
  // Profile Status
  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isOpenToWork: {
    type: Boolean,
    default: true
  },
  
  // Application History
  applications: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'],
      default: 'applied'
    },
    coverLetter: String,
    customResume: String
  }],
  
  // Saved Jobs
  savedJobs: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Activity & Analytics
  profileViews: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Settings
  preferences: {
    emailNotifications: {
      jobRecommendations: {
        type: Boolean,
        default: true
      },
      applicationUpdates: {
        type: Boolean,
        default: true
      },
      profileViews: {
        type: Boolean,
        default: true
      },
      newMessages: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: false
      },
      showLocation: {
        type: Boolean,
        default: true
      },
      allowRecruiterContact: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
userProfileSchema.index({ user: 1 });
userProfileSchema.index({ 'skills.name': 1 });
userProfileSchema.index({ 'jobPreferences.desiredRoles': 1 });
userProfileSchema.index({ 'jobPreferences.locations': 1 });
userProfileSchema.index({ isOpenToWork: 1, isPublic: 1 });
userProfileSchema.index({ profileCompletion: -1 });

// Calculate profile completion percentage
userProfileSchema.methods.calculateCompletion = function() {
  let score = 0;
  const maxScore = 100;
  
  // Basic info (20 points)
  if (this.firstName && this.lastName) score += 5;
  if (this.headline) score += 5;
  if (this.summary) score += 10;
  
  // Contact (10 points)
  if (this.phone) score += 5;
  if (this.location.city && this.location.country) score += 5;
  
  // Experience (25 points)
  if (this.experience.length > 0) score += 15;
  if (this.experience.length >= 2) score += 5;
  if (this.experience.some(exp => exp.description)) score += 5;
  
  // Education (15 points)
  if (this.education.length > 0) score += 10;
  if (this.education.length >= 2) score += 5;
  
  // Skills (15 points)
  if (this.skills.length >= 3) score += 10;
  if (this.skills.length >= 5) score += 5;
  
  // Documents (10 points)
  if (this.resume.url) score += 5;
  if (this.profilePicture) score += 2;
  if (this.portfolio.website || this.portfolio.github) score += 3;
  
  // Preferences (5 points)
  if (this.jobPreferences.desiredRoles.length > 0) score += 5;
  
  this.profileCompletion = Math.min(score, maxScore);
  return this.profileCompletion;
};

// Get full name
userProfileSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Get total experience years
userProfileSchema.virtual('totalExperienceYears').get(function() {
  if (!this.experience.length) return 0;
  
  let totalMonths = 0;
  this.experience.forEach(exp => {
    const start = new Date(exp.startDate);
    const end = exp.current ? new Date() : new Date(exp.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    totalMonths += months;
  });
  
  return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
});

// Get skill names array
userProfileSchema.virtual('skillNames').get(function() {
  return this.skills.map(skill => skill.name);
});

// Methods
userProfileSchema.methods.addApplication = function(jobId, coverLetter = '', customResume = '') {
  // Check if already applied
  const existingApp = this.applications.find(app => app.job.toString() === jobId.toString());
  if (existingApp) {
    throw new Error('Already applied to this job');
  }
  
  this.applications.push({
    job: jobId,
    coverLetter,
    customResume,
    appliedAt: new Date()
  });
  
  return this.save();
};

userProfileSchema.methods.saveJob = function(jobId) {
  // Check if already saved
  const existingSave = this.savedJobs.find(save => save.job.toString() === jobId.toString());
  if (existingSave) {
    return this; // Already saved
  }
  
  this.savedJobs.push({
    job: jobId,
    savedAt: new Date()
  });
  
  return this.save();
};

userProfileSchema.methods.unsaveJob = function(jobId) {
  this.savedJobs = this.savedJobs.filter(save => save.job.toString() !== jobId.toString());
  return this.save();
};

userProfileSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

// Static methods
userProfileSchema.statics.findBySkills = function(skills) {
  return this.find({
    'skills.name': { $in: skills },
    isPublic: true,
    isOpenToWork: true
  });
};

userProfileSchema.statics.findByLocation = function(city, state, country) {
  const query = { isPublic: true, isOpenToWork: true };
  if (city) query['location.city'] = new RegExp(city, 'i');
  if (state) query['location.state'] = new RegExp(state, 'i');
  if (country) query['location.country'] = new RegExp(country, 'i');
  return this.find(query);
};

// Pre-save middleware to calculate completion
userProfileSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.calculateCompletion();
  }
  next();
});

export default mongoose.model('UserProfile', userProfileSchema);
