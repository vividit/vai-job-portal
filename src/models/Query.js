import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  author: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'responses.author.role'
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      required: true
    }
  }
}, {
  timestamps: true
});

const querySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['jobseeker', 'recruiter', 'consultant', 'admin'],
      default: 'jobseeker'
    }
  },
  // For contact form submissions (no registered user)
  contactInfo: {
    name: String,
    email: String,
    phone: String
  },
  category: {
    type: String,
    enum: ['technical', 'account', 'jobs', 'billing', 'general', 'contact'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  responses: [responseSchema],
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  tags: [String],
  source: {
    type: String,
    enum: ['dashboard', 'contact_form', 'email', 'phone'],
    default: 'dashboard'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
querySchema.index({ status: 1, createdAt: -1 });
querySchema.index({ category: 1, priority: 1 });
querySchema.index({ 'user.email': 1 });
querySchema.index({ 'contactInfo.email': 1 });

// Virtual for response count
querySchema.virtual('responseCount').get(function() {
  return this.responses.length;
});

// Method to add response
querySchema.methods.addResponse = function(message, author) {
  this.responses.push({
    message,
    author,
    createdAt: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Method to update status
querySchema.methods.updateStatus = function(status, assignedTo = null) {
  this.status = status;
  if (assignedTo) {
    this.assignedTo = assignedTo;
  }
  this.updatedAt = new Date();
  return this.save();
};

// Static method to create from contact form
querySchema.statics.createFromContactForm = function(contactData) {
  return this.create({
    title: contactData.subject || 'Contact Form Inquiry',
    message: contactData.message,
    contactInfo: {
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone
    },
    category: 'contact',
    source: 'contact_form',
    priority: 'medium'
  });
};

export default mongoose.model('Query', querySchema);
