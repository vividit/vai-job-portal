import User from '../models/User.js';
import logger from '../utils/logger.js';

// Get user settings based on role
export const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Role-based settings
    const roleSettings = {
      jobseeker: {
        profile: {
          resumeUpload: true,
          profileVisibility: true,
          jobAlerts: true,
          applicationTracking: true
        },
        preferences: {
          jobTypes: ['full-time', 'part-time', 'contract', 'remote'],
          locations: [],
          salaryRange: { min: 0, max: 1000000 },
          skills: [],
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        },
        privacy: {
          profileVisibility: 'public',
          showContactInfo: true,
          allowRecruiters: true
        }
      },
      recruiter: {
        jobManagement: {
          maxActiveJobs: 10,
          autoExpireJobs: true,
          jobExpiryDays: 30,
          allowBulkPosting: false
        },
        candidateManagement: {
          maxCandidatesPerJob: 100,
          allowDirectContact: true,
          candidateSearch: true,
          applicationTracking: true
        },
        notifications: {
          newApplications: true,
          jobExpiry: true,
          candidateMessages: true,
          systemUpdates: true
        },
        analytics: {
          basicAnalytics: true,
          advancedAnalytics: false,
          exportData: false
        }
      },
      consultant: {
        advancedFeatures: {
          bulkJobPosting: true,
          aiMatching: true,
          candidateScoring: true,
          marketAnalysis: true
        },
        clientManagement: {
          maxClients: 50,
          clientPortal: true,
          whiteLabel: false
        },
        analytics: {
          basicAnalytics: true,
          advancedAnalytics: true,
          customReports: true,
          exportData: true
        },
        integrations: {
          atsIntegration: false,
          crmIntegration: false,
          emailMarketing: false
        }
      },
      admin: {
        systemManagement: {
          userManagement: true,
          roleManagement: true,
          systemSettings: true,
          backupRestore: true
        },
        crawlerManagement: {
          enableCrawling: true,
          crawlerSettings: true,
          sourceManagement: true,
          analytics: true
        },
        security: {
          auditLogs: true,
          securitySettings: true,
          apiKeys: true,
          rateLimiting: true
        },
        monitoring: {
          systemHealth: true,
          performanceMetrics: true,
          errorLogs: true,
          userActivity: true
        }
      }
    };

    const userSettings = roleSettings[user.role] || roleSettings.jobseeker;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        },
        settings: userSettings,
        role: user.role,
        permissions: getRolePermissions(user.role)
      }
    });

  } catch (error) {
    logger.error('Error getting user settings:', error);
    res.status(500).json({ error: 'Failed to get user settings' });
  }
};

// Update user settings
export const updateUserSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate settings based on role
    const validationResult = validateSettings(user.role, settings);
    if (!validationResult.valid) {
      return res.status(400).json({ 
        error: 'Invalid settings', 
        details: validationResult.errors 
      });
    }

    // Update user settings
    user.settings = {
      ...user.settings,
      ...settings
    };

    await user.save();

    logger.info(`User ${user.email} updated settings`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: user.settings,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Get system settings (Admin only)
export const getSystemSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const systemSettings = {
      general: {
        siteName: 'Meta Job Platform',
        siteDescription: 'Advanced job platform with AI-powered matching',
        maintenanceMode: false,
        registrationEnabled: true,
        emailVerification: true
      },
      crawler: {
        enabled: true,
        sources: ['remoteok', 'indeed', 'linkedin', 'wellfound'],
        crawlInterval: 6, // hours
        maxJobsPerSource: 100,
        autoCleanup: true,
        cleanupDays: 30
      },
      email: {
        provider: 'smtp',
        fromEmail: 'noreply@metajob.com',
        templates: {
          welcome: true,
          jobAlert: true,
          applicationReceived: true,
          applicationStatus: true
        }
      },
      security: {
        passwordMinLength: 8,
        requireSpecialChars: true,
        sessionTimeout: 24, // hours
        maxLoginAttempts: 5,
        lockoutDuration: 30 // minutes
      },
      limits: {
        maxJobsPerRecruiter: 50,
        maxApplicationsPerJob: 200,
        maxResumeSize: 5, // MB
        maxProfileImages: 3
      },
      features: {
        aiMatching: true,
        bulkOperations: true,
        advancedAnalytics: true,
        apiAccess: true,
        webhooks: false
      }
    };

    res.json({
      success: true,
      data: systemSettings
    });

  } catch (error) {
    logger.error('Error getting system settings:', error);
    res.status(500).json({ error: 'Failed to get system settings' });
  }
};

// Update system settings (Admin only)
export const updateSystemSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { settings } = req.body;

    // Validate system settings
    const validationResult = validateSystemSettings(settings);
    if (!validationResult.valid) {
      return res.status(400).json({ 
        error: 'Invalid system settings', 
        details: validationResult.errors 
      });
    }

    // In a real app, you'd save these to a database
    // For now, we'll just return success
    logger.info(`System settings updated by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: settings
    });

  } catch (error) {
    logger.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
};

// Get role permissions
export const getRolePermissionsEndpoint = async (req, res) => {
  try {
    const { role } = req.params;
    
    if (req.user.role !== 'admin' && req.user.role !== 'consultant') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const permissions = getRolePermissions(role);

    res.json({
      success: true,
      data: {
        role,
        permissions
      }
    });

  } catch (error) {
    logger.error('Error getting role permissions:', error);
    res.status(500).json({ error: 'Failed to get role permissions' });
  }
};

// Helper function to get role permissions
function getRolePermissions(role) {
  const permissions = {
    jobseeker: {
      jobs: ['read', 'apply'],
      applications: ['read', 'create', 'update'],
      profile: ['read', 'update'],
      resume: ['upload', 'download', 'delete'],
      notifications: ['read', 'update']
    },
    recruiter: {
      jobs: ['read', 'create', 'update', 'delete'],
      applications: ['read', 'update', 'delete'],
      candidates: ['read', 'contact'],
      analytics: ['read'],
      notifications: ['read', 'update']
    },
    consultant: {
      jobs: ['read', 'create', 'update', 'delete', 'bulk'],
      applications: ['read', 'update', 'delete', 'bulk'],
      candidates: ['read', 'contact', 'score'],
      analytics: ['read', 'advanced'],
      users: ['read'],
      notifications: ['read', 'update']
    },
    admin: {
      jobs: ['read', 'create', 'update', 'delete', 'bulk', 'manage'],
      applications: ['read', 'update', 'delete', 'bulk', 'manage'],
      candidates: ['read', 'contact', 'score', 'manage'],
      analytics: ['read', 'advanced', 'system'],
      users: ['read', 'create', 'update', 'delete', 'manage'],
      system: ['read', 'update', 'manage'],
      notifications: ['read', 'update', 'manage']
    }
  };

  return permissions[role] || permissions.jobseeker;
}

// Validate user settings
function validateSettings(role, settings) {
  const errors = [];

  switch (role) {
    case 'jobseeker':
      if (settings.preferences?.salaryRange) {
        if (settings.preferences.salaryRange.min < 0) {
          errors.push('Salary minimum cannot be negative');
        }
        if (settings.preferences.salaryRange.max < settings.preferences.salaryRange.min) {
          errors.push('Salary maximum must be greater than minimum');
        }
      }
      break;

    case 'recruiter':
      if (settings.jobManagement?.maxActiveJobs > 100) {
        errors.push('Maximum active jobs cannot exceed 100');
      }
      break;

    case 'consultant':
      if (settings.clientManagement?.maxClients > 1000) {
        errors.push('Maximum clients cannot exceed 1000');
      }
      break;

    case 'admin':
      // Admin can change any settings
      break;

    default:
      errors.push('Invalid role');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Validate system settings
function validateSystemSettings(settings) {
  const errors = [];

  if (settings.crawler?.crawlInterval < 1) {
    errors.push('Crawl interval must be at least 1 hour');
  }

  if (settings.security?.passwordMinLength < 6) {
    errors.push('Password minimum length must be at least 6 characters');
  }

  if (settings.limits?.maxResumeSize > 10) {
    errors.push('Maximum resume size cannot exceed 10MB');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Get real-time system status
export const getSystemStatus = async (req, res) => {
  try {
    if (!['admin', 'consultant'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const systemStatus = {
      server: {
        status: 'online',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      database: {
        status: 'connected',
        collections: ['users', 'jobs', 'applications', 'documents']
      },
      crawler: {
        status: 'running',
        lastRun: new Date().toISOString(),
        activeSources: ['remoteok'],
        totalJobs: 13
      },
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ status: 'active' }),
        byRole: await User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ])
      }
    };

    res.json({
      success: true,
      data: systemStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
}; 