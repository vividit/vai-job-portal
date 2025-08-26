import mongoose from 'mongoose';

const crawlerInstanceSchema = new mongoose.Schema({
  crawlerId: {
    type: Number,
    required: true,
    unique: true // C1 = 1, C2 = 2, etc.
  },
  name: {
    type: String,
    required: true // "Crawler 1", "Crawler 2", etc.
  },
  status: {
    type: String,
    enum: ['idle', 'running', 'paused', 'error', 'disabled'],
    default: 'idle'
  },
  configuration: {
    sources: [String], // ['linkedin', 'indeed', 'remoteok']
    searchTerms: [String], // ['software engineer', 'developer']
    locations: [String], // ['remote', 'san francisco']
    maxJobsPerSource: {
      type: Number,
      default: 25
    },
    respectRobots: {
      type: Boolean,
      default: true
    },
    crawlInterval: {
      type: Number,
      default: 3600000 // 1 hour in milliseconds
    }
  },
  companies: {
    type: [{
      name: String,
      url: String,
      robotsAllowed: Boolean,
      jobs: Number,
      level: String, // 'All Levels', 'Senior', etc.
      type: String, // 'FTE', 'Contract', etc.
      location: String
    }],
    default: []
  },
  statistics: {
    totalRuns: {
      type: Number,
      default: 0
    },
    totalJobsFound: {
      type: Number,
      default: 0
    },
    totalJobsSaved: {
      type: Number,
      default: 0
    },
    lastRunAt: Date,
    nextRunAt: Date,
    averageRunTime: {
      type: Number,
      default: 0 // in seconds
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better performance
crawlerInstanceSchema.index({ crawlerId: 1 });
crawlerInstanceSchema.index({ status: 1 });
crawlerInstanceSchema.index({ isActive: 1 });

// Method to start crawler
crawlerInstanceSchema.methods.start = function() {
  this.status = 'running';
  this.statistics.lastRunAt = new Date();
  return this.save();
};

// Method to stop crawler
crawlerInstanceSchema.methods.stop = function() {
  this.status = 'idle';
  return this.save();
};

// Method to update statistics
crawlerInstanceSchema.methods.updateStats = function(runData) {
  this.statistics.totalRuns += 1;
  this.statistics.totalJobsFound += runData.jobsFound || 0;
  this.statistics.totalJobsSaved += runData.jobsSaved || 0;
  
  if (runData.runTime) {
    const totalRunTime = this.statistics.averageRunTime * (this.statistics.totalRuns - 1) + runData.runTime;
    this.statistics.averageRunTime = Math.round(totalRunTime / this.statistics.totalRuns);
  }
  
  return this.save();
};

export default mongoose.model('CrawlerInstance', crawlerInstanceSchema);
