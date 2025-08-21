import mongoose from 'mongoose';

const crawlerSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'stopped'],
    default: 'running'
  },
  crawlerInstance: {
    type: Number,
    required: true // C1, C2, C3, C4
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  configuration: {
    sources: [String],
    companies: [String],
    searchTerms: [String],
    locations: [String],
    maxJobs: Number,
    filters: {
      type: Object,
      default: {}
    }
  },
  statistics: {
    totalJobsFound: {
      type: Number,
      default: 0
    },
    jobsSaved: {
      type: Number,
      default: 0
    },
    companiesFetched: {
      type: Number,
      default: 0
    },
    titlesFetched: {
      type: Number,
      default: 0
    },
    executionTime: {
      type: Number,
      default: 0 // in seconds
    },
    jobsByType: {
      remote: { type: Number, default: 0 },
      fullTime: { type: Number, default: 0 },
      partTime: { type: Number, default: 0 },
      contract: { type: Number, default: 0 }
    },
    jobsByExperience: {
      entry: { type: Number, default: 0 },
      mid: { type: Number, default: 0 },
      senior: { type: Number, default: 0 }
    }
  },
  progress: {
    currentStep: String,
    stepsCompleted: Number,
    totalSteps: Number,
    currentSource: String,
    currentCompany: String
  },
  results: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    title: String,
    company: String,
    location: String,
    source: String,
    fetchedAt: {
      type: Date,
      default: Date.now
    }
  }],
  errors: [{
    source: String,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error']
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
crawlerSessionSchema.index({ sessionId: 1 });
crawlerSessionSchema.index({ status: 1 });
crawlerSessionSchema.index({ crawlerInstance: 1 });
crawlerSessionSchema.index({ startTime: -1 });

// Virtual for duration
crawlerSessionSchema.virtual('duration').get(function() {
  if (this.endTime) {
    return Math.round((this.endTime - this.startTime) / 1000);
  }
  return Math.round((new Date() - this.startTime) / 1000);
});

// Method to update progress
crawlerSessionSchema.methods.updateProgress = function(progress) {
  this.progress = { ...this.progress, ...progress };
  return this.save();
};

// Method to add result
crawlerSessionSchema.methods.addResult = function(result) {
  this.results.push(result);
  this.statistics.totalJobsFound = this.results.length;
  return this.save();
};

// Method to add notification
crawlerSessionSchema.methods.addNotification = function(type, message) {
  this.notifications.push({ type, message });
  return this.save();
};

// Method to complete session
crawlerSessionSchema.methods.complete = function(status = 'completed') {
  this.status = status;
  this.endTime = new Date();
  this.statistics.executionTime = Math.round((this.endTime - this.startTime) / 1000);
  return this.save();
};

export default mongoose.model('CrawlerSession', crawlerSessionSchema);
