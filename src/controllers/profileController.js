import UserProfile from '../models/UserProfile.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import logger from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = file.fieldname === 'profilePicture' 
      ? 'src/uploads/profiles/' 
      : 'src/uploads/resumes/';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'profilePicture') {
      // Accept only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for profile picture'));
      }
    } else if (file.fieldname === 'resume') {
      // Accept PDF and DOC files
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF and DOC files are allowed for resume'));
      }
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

// Get current user's profile
export const getMyProfile = async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ user: req.user._id })
      .populate('user', 'name email role createdAt')
      .populate('applications.job', 'title company location type salary')
      .populate('savedJobs.job', 'title company location type salary');

    if (!profile) {
      // Create empty profile if doesn't exist
      profile = await UserProfile.create({
        user: req.user._id,
        firstName: req.user.name?.split(' ')[0] || '',
        lastName: req.user.name?.split(' ').slice(1).join(' ') || ''
      });
      
      // Populate after creation
      profile = await UserProfile.findById(profile._id)
        .populate('user', 'name email role createdAt')
        .populate('applications.job', 'title company location type salary')
        .populate('savedJobs.job', 'title company location type salary');
    }

    // Calculate and update completion
    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

// Update basic profile info
export const updateBasicInfo = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      headline,
      summary,
      phone,
      location
    } = req.body;

    let profile = await UserProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      profile = new UserProfile({ user: req.user._id });
    }

    // Update fields
    if (firstName !== undefined) profile.firstName = firstName;
    if (lastName !== undefined) profile.lastName = lastName;
    if (headline !== undefined) profile.headline = headline;
    if (summary !== undefined) profile.summary = summary;
    if (phone !== undefined) profile.phone = phone;
    if (location !== undefined) profile.location = { ...profile.location, ...location };

    // Calculate completion and save
    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      message: 'Basic info updated successfully',
      data: profile
    });

  } catch (error) {
    logger.error('Error updating basic info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update basic info'
    });
  }
};

// Add/Update experience
export const addExperience = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    const experience = req.body;
    
    if (req.params.id) {
      // Update existing experience
      const expIndex = profile.experience.findIndex(exp => exp._id.toString() === req.params.id);
      if (expIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Experience not found'
        });
      }
      profile.experience[expIndex] = { ...profile.experience[expIndex].toObject(), ...experience };
    } else {
      // Add new experience
      profile.experience.push(experience);
    }

    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      message: req.params.id ? 'Experience updated successfully' : 'Experience added successfully',
      data: profile.experience
    });

  } catch (error) {
    logger.error('Error adding/updating experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save experience'
    });
  }
};

// Delete experience
export const deleteExperience = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.experience = profile.experience.filter(exp => exp._id.toString() !== req.params.id);
    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      message: 'Experience deleted successfully',
      data: profile.experience
    });

  } catch (error) {
    logger.error('Error deleting experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete experience'
    });
  }
};

// Add/Update education
export const addEducation = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    const education = req.body;
    
    if (req.params.id) {
      // Update existing education
      const eduIndex = profile.education.findIndex(edu => edu._id.toString() === req.params.id);
      if (eduIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Education not found'
        });
      }
      profile.education[eduIndex] = { ...profile.education[eduIndex].toObject(), ...education };
    } else {
      // Add new education
      profile.education.push(education);
    }

    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      message: req.params.id ? 'Education updated successfully' : 'Education added successfully',
      data: profile.education
    });

  } catch (error) {
    logger.error('Error adding/updating education:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save education'
    });
  }
};

// Delete education
export const deleteEducation = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.education = profile.education.filter(edu => edu._id.toString() !== req.params.id);
    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      message: 'Education deleted successfully',
      data: profile.education
    });

  } catch (error) {
    logger.error('Error deleting education:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete education'
    });
  }
};

// Update skills
export const updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;
    
    const profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.skills = skills;
    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      message: 'Skills updated successfully',
      data: profile.skills
    });

  } catch (error) {
    logger.error('Error updating skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update skills'
    });
  }
};

// Update job preferences
export const updateJobPreferences = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.jobPreferences = { ...profile.jobPreferences, ...req.body };
    profile.calculateCompletion();
    await profile.save();

    res.json({
      success: true,
      message: 'Job preferences updated successfully',
      data: profile.jobPreferences
    });

  } catch (error) {
    logger.error('Error updating job preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job preferences'
    });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req, res) => {
  upload.single('profilePicture')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    try {
      const profile = await UserProfile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      // Delete old profile picture
      if (profile.profilePicture) {
        const oldPath = path.join(process.cwd(), 'src/uploads/profiles/', path.basename(profile.profilePicture));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update profile with new picture URL
      profile.profilePicture = `/uploads/profiles/${req.file.filename}`;
      profile.calculateCompletion();
      await profile.save();

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: profile.profilePicture
        }
      });

    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload profile picture'
      });
    }
  });
};

// Upload resume
export const uploadResume = async (req, res) => {
  upload.single('resume')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    try {
      const profile = await UserProfile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      // Delete old resume
      if (profile.resume.url) {
        const oldPath = path.join(process.cwd(), 'src/uploads/resumes/', path.basename(profile.resume.url));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update profile with new resume
      profile.resume = {
        filename: req.file.originalname,
        url: `/uploads/resumes/${req.file.filename}`,
        uploadDate: new Date()
      };
      profile.calculateCompletion();
      await profile.save();

      res.json({
        success: true,
        message: 'Resume uploaded successfully',
        data: {
          resume: profile.resume
        }
      });

    } catch (error) {
      logger.error('Error uploading resume:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload resume'
      });
    }
  });
};

// Apply to job
export const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter, customResume } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Get user profile
    const profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Please complete your profile first.'
      });
    }

    // Check if resume exists
    if (!profile.resume.url) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a resume before applying to jobs'
      });
    }

    // Apply to job
    await profile.addApplication(jobId, coverLetter, customResume);

    logger.info(`User ${req.user._id} applied to job ${jobId}`);

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        jobId,
        appliedAt: new Date()
      }
    });

  } catch (error) {
    if (error.message === 'Already applied to this job') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    logger.error('Error applying to job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application'
    });
  }
};

// Save/Unsave job
export const toggleSaveJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Get user profile
    let profile = await UserProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = await UserProfile.create({ user: req.user._id });
    }

    // Check if already saved
    const existingSave = profile.savedJobs.find(save => save.job.toString() === jobId);
    
    if (existingSave) {
      // Unsave job
      await profile.unsaveJob(jobId);
      res.json({
        success: true,
        message: 'Job removed from saved jobs',
        data: { saved: false }
      });
    } else {
      // Save job
      await profile.saveJob(jobId);
      res.json({
        success: true,
        message: 'Job saved successfully',
        data: { saved: true }
      });
    }

  } catch (error) {
    logger.error('Error toggling save job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save/unsave job'
    });
  }
};

// Get saved jobs
export const getSavedJobs = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id })
      .populate({
        path: 'savedJobs.job',
        select: 'title company location type salary description tags source featured datePosted'
      });

    if (!profile) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Filter out any null jobs (in case job was deleted)
    const savedJobs = profile.savedJobs
      .filter(save => save.job)
      .map(save => ({
        ...save.job.toObject(),
        savedAt: save.savedAt
      }));

    res.json({
      success: true,
      data: savedJobs
    });

  } catch (error) {
    logger.error('Error fetching saved jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved jobs'
    });
  }
};

// Get application history
export const getApplicationHistory = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id })
      .populate({
        path: 'applications.job',
        select: 'title company location type salary description tags source featured datePosted'
      });

    if (!profile) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Filter out any null jobs and format response
    const applications = profile.applications
      .filter(app => app.job)
      .map(app => ({
        ...app.job.toObject(),
        applicationId: app._id,
        appliedAt: app.appliedAt,
        status: app.status,
        coverLetter: app.coverLetter
      }))
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.json({
      success: true,
      data: applications
    });

  } catch (error) {
    logger.error('Error fetching application history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application history'
    });
  }
};

// Get profile by ID (public view)
export const getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await UserProfile.findOne({ user: userId, isPublic: true })
      .populate('user', 'name email')
      .select('-applications -savedJobs -preferences');

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found or not public'
      });
    }

    // Increment profile views
    profile.profileViews += 1;
    await profile.save();

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    logger.error('Error fetching profile by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

// Search profiles (for recruiters)
export const searchProfiles = async (req, res) => {
  try {
    const {
      skills,
      location,
      experience,
      education,
      page = 1,
      limit = 20
    } = req.query;

    const query = { isPublic: true, isOpenToWork: true };

    // Add skill filter
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query['skills.name'] = { $in: skillsArray };
    }

    // Add location filter
    if (location) {
      query.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') },
        { 'location.country': new RegExp(location, 'i') }
      ];
    }

    const profiles = await UserProfile.find(query)
      .populate('user', 'name email')
      .select('-applications -savedJobs -preferences')
      .sort({ profileCompletion: -1, lastActive: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await UserProfile.countDocuments(query);

    res.json({
      success: true,
      data: {
        profiles,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error searching profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search profiles'
    });
  }
};
