import SystemConfig from '../models/SystemConfig.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import RegisteredCompany from '../models/RegisteredCompany.js';
import Query from '../models/Query.js';
import mongoose from 'mongoose';

// Get system configuration
export const getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.getSingleton();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching system config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system configuration',
      error: error.message
    });
  }
};

// Update system configuration
export const updateSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.getSingleton();
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (config.schema.paths[key]) {
        config[key] = req.body[key];
      }
    });
    
    config.lastModified = new Date();
    config.modifiedBy = req.user._id;
    
    await config.save();
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system configuration',
      error: error.message
    });
  }
};

// Get system statistics
export const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalJobs,
      totalCompanies,
      totalQueries,
      adminUsers,
      activeJobs,
      pendingQueries
    ] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      RegisteredCompany.countDocuments(),
      Query.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Job.countDocuments({ status: 'active' }),
      Query.countDocuments({ status: 'pending' })
    ]);

    // Get database size (this is a simplified approach)
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const databaseSize = (stats.dataSize / (1024 * 1024)).toFixed(2); // MB

    // Calculate system uptime
    const uptimeSeconds = process.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / (24 * 3600));
    const uptimeHours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
    const systemUptime = `${uptimeDays} days, ${uptimeHours} hours`;

    // Get memory usage
    const memUsage = process.memoryUsage();
    const serverMemory = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalJobs,
        totalCompanies,
        totalQueries,
        adminUsers,
        activeJobs,
        pendingQueries,
        systemUptime,
        databaseSize: `${databaseSize} MB`,
        serverMemory: `${serverMemory}%`,
        diskUsage: '0%' // This would require additional system calls
      }
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics',
      error: error.message
    });
  }
};

// Test email configuration
export const testEmailConfig = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    // This is a mock test - in a real implementation, you would
    // use the SMTP settings to send an actual test email
    const config = await SystemConfig.getSingleton();
    
    if (!config.smtpHost || !config.smtpUser) {
      return res.status(400).json({
        success: false,
        message: 'SMTP configuration is incomplete'
      });
    }

    // Simulate email test
    res.json({
      success: true,
      message: `Test email would be sent to ${email} using ${config.smtpHost}`
    });
  } catch (error) {
    console.error('Error testing email config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration',
      error: error.message
    });
  }
};

// Get system health
export const getSystemHealth = async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const memUsage = process.memoryUsage();
    
    const health = {
      status: 'healthy',
      database: dbStatus,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      timestamp: new Date()
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check system health',
      error: error.message
    });
  }
};
