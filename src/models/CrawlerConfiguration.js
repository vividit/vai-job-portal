import mongoose from 'mongoose';

const companyConfigurationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  website: {
    type: String,
    required: true
  },
  careersUrl: {
    type: String,
    required: true
  },
  robotsAllowed: {
    type: Boolean,
    default: true
  },
  evaluation: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'pending'
  },
  numberOfJobs: {
    type: Number,
    default: 0
  },
  employmentLevel: {
    type: String,
    enum: ['all', 'entry', 'mid', 'senior', 'executive'],
    default: 'all'
  },
  employmentTypes: {
    type: [String],
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    default: ['full-time']
  },
  location: {
    type: String,
    default: 'all'
  },
  hybridRemoteSupport: {
    type: String,
    enum: ['all', 'hybrid', 'remote', 'onsite'],
    default: 'all'
  },
  category: {
    type: String,
    enum: ['faang', 'tech_giants', 'unicorns', 'fintech', 'healthcare', 'consulting', 'gaming', 'ai_ml', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  crawlFrequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    default: 'daily'
  },
  lastCrawled: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  apiKey: String,
  apiEndpoint: String,
  crawlMethod: {
    type: String,
    enum: ['browser', 'api', 'hybrid'],
    default: 'browser'
  },
  selectors: {
    jobList: String,
    jobTitle: String,
    company: String,
    location: String,
    description: String,
    salary: String,
    type: String,
    postedDate: String
  },
  headers: {
    type: Object,
    default: {}
  },
  rateLimiting: {
    requestsPerMinute: {
      type: Number,
      default: 30
    },
    delayBetweenRequests: {
      type: Number,
      default: 2000 // milliseconds
    }
  }
}, {
  timestamps: true
});

const crawlerConfigurationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  crawlerInstances: {
    total: {
      type: Number,
      default: 4
    },
    active: {
      type: Number,
      default: 0
    }
  },
  globalSettings: {
    maxJobsPerSession: {
      type: Number,
      default: 1000
    },
    maxSessionDuration: {
      type: Number,
      default: 3600 // 1 hour in seconds
    },
    enableParallelCrawling: {
      type: Boolean,
      default: true
    },
    enableRealTimeUpdates: {
      type: Boolean,
      default: true
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    autoRestartOnFailure: {
      type: Boolean,
      default: true
    }
  },
  filters: {
    locations: [String],
    keywords: [String],
    experienceLevels: [String],
    jobTypes: [String],
    salaryRange: {
      min: Number,
      max: Number
    },
    excludeKeywords: [String],
    dateRange: {
      from: Date,
      to: Date
    }
  },
  sources: {
    jobSites: [{
      name: String,
      url: String,
      isActive: Boolean,
      priority: String,
      category: String
    }],
    companies: [companyConfigurationSchema]
  },
  scheduling: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    time: String, // HH:MM format
    days: [String], // For weekly scheduling
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  performance: {
    averageJobsPerMinute: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 0
    },
    totalJobsCrawled: {
      type: Number,
      default: 0
    },
    totalSessionsCompleted: {
      type: Number,
      default: 0
    },
    lastOptimized: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add indexes
crawlerConfigurationSchema.index({ name: 1 });
crawlerConfigurationSchema.index({ isActive: 1 });
crawlerConfigurationSchema.index({ 'sources.companies.category': 1 });

// Method to get active companies by category
crawlerConfigurationSchema.methods.getCompaniesByCategory = function(category) {
  return this.sources.companies.filter(company => 
    company.category === category && company.isActive
  );
};

// Method to update performance metrics
crawlerConfigurationSchema.methods.updatePerformance = function(metrics) {
  this.performance = { ...this.performance, ...metrics };
  this.performance.lastOptimized = new Date();
  return this.save();
};

export default mongoose.model('CrawlerConfiguration', crawlerConfigurationSchema);
