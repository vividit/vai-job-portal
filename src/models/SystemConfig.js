import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  // Site Settings
  siteName: {
    type: String,
    default: 'Meta Job Platform'
  },
  siteDescription: {
    type: String,
    default: 'Advanced job search and recruitment platform'
  },
  contactEmail: {
    type: String,
    default: 'contact@metajob.com'
  },
  supportEmail: {
    type: String,
    default: 'support@metajob.com'
  },
  
  // File Settings
  maxFileSize: {
    type: Number,
    default: 10 // MB
  },
  allowedFileTypes: {
    type: [String],
    default: ['pdf', 'doc', 'docx']
  },
  
  // Email Settings
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smtpHost: {
    type: String,
    default: 'smtp.gmail.com'
  },
  smtpPort: {
    type: Number,
    default: 587
  },
  smtpUser: {
    type: String,
    default: ''
  },
  smtpPass: {
    type: String,
    default: ''
  },
  
  // System Settings
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  emailVerification: {
    type: Boolean,
    default: true
  },
  
  // Security Settings
  sessionTimeout: {
    type: Number,
    default: 24 // hours
  },
  maxLoginAttempts: {
    type: Number,
    default: 5
  },
  passwordMinLength: {
    type: Number,
    default: 8
  },
  
  // Crawler Settings
  crawlerInterval: {
    type: Number,
    default: 30 // minutes
  },
  
  // Backup Settings
  backupEnabled: {
    type: Boolean,
    default: true
  },
  backupFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  
  // Analytics Settings
  analyticsEnabled: {
    type: Boolean,
    default: true
  },
  logLevel: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    default: 'info'
  },
  
  // Metadata
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one config document exists
systemConfigSchema.statics.getSingleton = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

export default SystemConfig;
