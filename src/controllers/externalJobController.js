import externalJobApplicationService from '../services/externalJobApplicationService.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import RegisteredCompany from '../models/RegisteredCompany.js';
import UserProfile from '../models/UserProfile.js';
import logger from '../utils/logger.js';

// Apply to external job
export const applyToExternalJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter, autoApply = false, resumePath } = req.body;
    const userId = req.user._id;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      userId,
      jobId,
      status: { $ne: 'saved' }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Already applied to this job'
      });
    }

    // Check user profile completeness
    const userProfile = await UserProfile.findOne({ user: userId });
    if (!userProfile || !userProfile.personalInfo.firstName || !userProfile.personalInfo.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile before applying to jobs'
      });
    }

    // Apply to external job
    const result = await externalJobApplicationService.applyToExternalJob(
      jobId, 
      userId, 
      { coverLetter, autoApply, resumePath }
    );

    res.json({
      success: result.success,
      data: result.application || null,
      message: result.message,
      applicationUrl: result.applicationUrl,
      requiresManualApplication: result.requiresManualApplication || false
    });

  } catch (error) {
    logger.error('Error applying to external job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply to external job'
    });
  }
};

// Save job for later
export const saveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    const result = await externalJobApplicationService.saveJobForLater(jobId, userId);

    res.json({
      success: result.success,
      data: result.application,
      message: result.message
    });

  } catch (error) {
    logger.error('Error saving job:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to save job'
    });
  }
};

// Get saved jobs
export const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await externalJobApplicationService.getSavedJobs(userId);

    res.json({
      success: result.success,
      data: result.savedJobs,
      message: result.message
    });

  } catch (error) {
    logger.error('Error fetching saved jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved jobs'
    });
  }
};

// Remove saved job
export const removeSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    const application = await Application.findOneAndDelete({
      userId,
      jobId,
      status: 'saved',
      savedAt: { $exists: true }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job removed from saved list'
    });

  } catch (error) {
    logger.error('Error removing saved job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove saved job'
    });
  }
};

// Get application status for external job
export const getExternalApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await Application.findOne({
      _id: applicationId,
      userId
    }).populate('jobId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // If it's an external application, we can't get real-time status
    // Return stored status
    res.json({
      success: true,
      data: {
        application,
        externalData: application.externalApplicationData,
        lastUpdated: application.updatedAt
      },
      message: 'Application status retrieved'
    });

  } catch (error) {
    logger.error('Error fetching application status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application status'
    });
  }
};

// Apply with AI agent
export const applyWithAgent = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { 
      coverLetterTemplate,
      autoGenerateCoverLetter = true,
      matchingCriteria = {},
      autoApplyThreshold = 0.8
    } = req.body;
    const userId = req.user._id;

    // Get user profile for matching
    const userProfile = await UserProfile.findOne({ user: userId }).populate('user');
    if (!userProfile) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile before using AI agent'
      });
    }

    // Get job details
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Calculate matching score based on skills, experience, etc.
    const matchingScore = calculateJobMatchScore(job, userProfile, matchingCriteria);

    // Generate cover letter if needed
    let coverLetter = coverLetterTemplate;
    if (autoGenerateCoverLetter) {
      coverLetter = generateCoverLetter(job, userProfile, coverLetterTemplate);
    }

    // Decide whether to auto-apply based on matching score
    const shouldAutoApply = matchingScore >= autoApplyThreshold;

    if (!shouldAutoApply) {
      return res.json({
        success: true,
        autoApplied: false,
        matchingScore,
        message: `Job match score (${matchingScore.toFixed(2)}) below threshold (${autoApplyThreshold}). Manual review recommended.`,
        generatedCoverLetter: coverLetter,
        jobDetails: {
          title: job.title,
          company: job.company,
          location: job.location
        }
      });
    }

    // Auto-apply using the service
    const result = await externalJobApplicationService.applyToExternalJob(
      jobId,
      userId,
      {
        coverLetter,
        autoApply: true,
        resumePath: userProfile.resume.path
      }
    );

    res.json({
      success: result.success,
      autoApplied: true,
      matchingScore,
      data: result.application,
      message: result.message,
      generatedCoverLetter: coverLetter
    });

  } catch (error) {
    logger.error('Error applying with AI agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply with AI agent'
    });
  }
};

// Bulk apply to multiple jobs
export const bulkApplyToJobs = async (req, res) => {
  try {
    const { 
      jobIds, 
      coverLetterTemplate, 
      autoApply = false,
      matchingCriteria = {},
      autoApplyThreshold = 0.8
    } = req.body;
    const userId = req.user._id;

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Job IDs array is required'
      });
    }

    const userProfile = await UserProfile.findOne({ user: userId }).populate('user');
    if (!userProfile) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile before bulk applying'
      });
    }

    const results = [];
    const errors = [];

    for (const jobId of jobIds) {
      try {
        const job = await Job.findById(jobId);
        if (!job) {
          errors.push({ jobId, error: 'Job not found' });
          continue;
        }

        // Check if already applied
        const existingApplication = await Application.findOne({
          userId,
          jobId,
          status: { $ne: 'saved' }
        });

        if (existingApplication) {
          errors.push({ jobId, error: 'Already applied to this job' });
          continue;
        }

        // Calculate matching score
        const matchingScore = calculateJobMatchScore(job, userProfile, matchingCriteria);

        // Generate personalized cover letter
        const coverLetter = generateCoverLetter(job, userProfile, coverLetterTemplate);

        // Apply based on threshold
        const shouldApply = !autoApply || matchingScore >= autoApplyThreshold;

        if (shouldApply) {
          const result = await externalJobApplicationService.applyToExternalJob(
            jobId,
            userId,
            {
              coverLetter,
              autoApply,
              resumePath: userProfile.resume.path
            }
          );

          results.push({
            jobId,
            jobTitle: job.title,
            company: job.company,
            success: result.success,
            matchingScore,
            message: result.message,
            applicationUrl: result.applicationUrl
          });
        } else {
          results.push({
            jobId,
            jobTitle: job.title,
            company: job.company,
            success: false,
            matchingScore,
            message: `Match score (${matchingScore.toFixed(2)}) below threshold`,
            skipped: true
          });
        }

        // Add delay between applications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        errors.push({ jobId, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        applied: results.filter(r => r.success).length,
        skipped: results.filter(r => r.skipped).length,
        failed: errors.length,
        results,
        errors
      },
      message: 'Bulk application process completed'
    });

  } catch (error) {
    logger.error('Error in bulk apply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk applications'
    });
  }
};

// Helper function to calculate job match score
function calculateJobMatchScore(job, userProfile, criteria = {}) {
  let score = 0;
  let totalFactors = 0;

  // Skills matching (30% weight)
  if (job.skills && job.skills.length > 0 && userProfile.skills && userProfile.skills.length > 0) {
    const jobSkills = job.skills.map(s => s.toLowerCase());
    const userSkills = userProfile.skills.map(s => s.toLowerCase());
    const matchingSkills = jobSkills.filter(skill => userSkills.includes(skill));
    const skillScore = matchingSkills.length / jobSkills.length;
    score += skillScore * 0.3;
    totalFactors += 0.3;
  }

  // Experience matching (25% weight)
  if (job.experience && userProfile.workExperience && userProfile.workExperience.length > 0) {
    const jobExpPattern = job.experience.toLowerCase();
    const userYearsExperience = userProfile.workExperience.reduce((total, exp) => {
      const years = calculateExperienceYears(exp.startDate, exp.endDate);
      return total + years;
    }, 0);

    // Simple experience matching logic
    let expScore = 0;
    if (jobExpPattern.includes('entry') || jobExpPattern.includes('0-1')) {
      expScore = userYearsExperience <= 2 ? 1 : 0.7;
    } else if (jobExpPattern.includes('2-3') || jobExpPattern.includes('junior')) {
      expScore = userYearsExperience >= 1 && userYearsExperience <= 4 ? 1 : 0.7;
    } else if (jobExpPattern.includes('3-5') || jobExpPattern.includes('mid')) {
      expScore = userYearsExperience >= 2 && userYearsExperience <= 6 ? 1 : 0.7;
    } else if (jobExpPattern.includes('5+') || jobExpPattern.includes('senior')) {
      expScore = userYearsExperience >= 4 ? 1 : 0.5;
    } else {
      expScore = 0.8; // Default if can't parse experience requirement
    }

    score += expScore * 0.25;
    totalFactors += 0.25;
  }

  // Location matching (20% weight)
  if (job.location && userProfile.jobPreferences && userProfile.jobPreferences.preferredLocations) {
    const jobLocation = job.location.toLowerCase();
    const userLocations = userProfile.jobPreferences.preferredLocations.map(l => l.toLowerCase());
    const locationMatch = userLocations.some(loc => 
      jobLocation.includes(loc) || loc.includes('remote') && jobLocation.includes('remote')
    );
    score += (locationMatch ? 1 : 0.3) * 0.2;
    totalFactors += 0.2;
  }

  // Job type matching (15% weight)
  if (job.type && userProfile.jobPreferences && userProfile.jobPreferences.jobTypes) {
    const jobType = job.type.toLowerCase();
    const userJobTypes = userProfile.jobPreferences.jobTypes.map(t => t.toLowerCase());
    const typeMatch = userJobTypes.includes(jobType);
    score += (typeMatch ? 1 : 0.5) * 0.15;
    totalFactors += 0.15;
  }

  // Industry matching (10% weight)
  if (job.department && userProfile.jobPreferences && userProfile.jobPreferences.industries) {
    const jobDept = job.department.toLowerCase();
    const userIndustries = userProfile.jobPreferences.industries.map(i => i.toLowerCase());
    const industryMatch = userIndustries.some(ind => 
      jobDept.includes(ind) || ind.includes(jobDept)
    );
    score += (industryMatch ? 1 : 0.4) * 0.1;
    totalFactors += 0.1;
  }

  // Apply user-defined criteria weights
  if (criteria.skillsWeight) {
    // Adjust weights based on user preferences
    // This is a simplified implementation
  }

  return totalFactors > 0 ? Math.min(score / totalFactors, 1) : 0.5;
}

// Helper function to generate cover letter
function generateCoverLetter(job, userProfile, template = '') {
  const defaultTemplate = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my background in ${userProfile.skills.slice(0, 3).join(', ')}, I am confident that I would be a valuable addition to your team.

${userProfile.workExperience && userProfile.workExperience.length > 0 ? 
  `In my previous role as ${userProfile.workExperience[0].jobTitle} at ${userProfile.workExperience[0].company}, I gained valuable experience that directly relates to this position.` : 
  'I am eager to apply my skills and enthusiasm to contribute to your organization.'
}

I am particularly drawn to this opportunity because ${job.description ? job.description.substring(0, 100) + '...' : 'of the company\'s reputation and growth potential'}.

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can contribute to ${job.company}'s continued success.

Best regards,
${userProfile.personalInfo.firstName} ${userProfile.personalInfo.lastName}`;

  return template || defaultTemplate;
}

// Helper function to calculate years of experience
function calculateExperienceYears(startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffTime = Math.abs(end - start);
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(diffYears * 10) / 10; // Round to 1 decimal place
}
