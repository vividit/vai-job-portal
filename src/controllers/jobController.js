import Job from "../models/Job.js";
import Application from "../models/Application.js";
import RegisteredCompany from "../models/RegisteredCompany.js";
import path from "path";
import fs from "fs";

// Create job (with permission and quota checking)
export const createJob = async (req, res) => {
  try {
    // Check if user is a recruiter and has a company
    if (req.user.role === 'recruiter' && !req.user.companyId) {
      return res.status(403).json({ 
        error: "Recruiters must onboard their company before posting jobs" 
      });
    }

    // For recruiters, check company verification and permissions
    if (req.user.role === 'recruiter' && req.user.companyId) {
      const company = await RegisteredCompany.findById(req.user.companyId);
      
      if (!company) {
        return res.status(404).json({ 
          error: "Company not found" 
        });
      }

      if (company.status !== 'verified') {
        return res.status(403).json({ 
          error: "Company must be verified by admin before posting jobs" 
        });
      }

      if (!company.recruiterPermissions.canPostJobs) {
        return res.status(403).json({ 
          error: "Company does not have permission to post jobs" 
        });
      }

      // Check job posting quota
      if (company.jobPostingQuota.limit !== -1 && 
          company.jobPostingQuota.used >= company.jobPostingQuota.limit) {
        return res.status(403).json({ 
          error: `Job posting quota exceeded. Used ${company.jobPostingQuota.used}/${company.jobPostingQuota.limit}` 
        });
      }

      // Increment job posting quota
      await RegisteredCompany.findByIdAndUpdate(
        req.user.companyId,
        { $inc: { 'jobPostingQuota.used': 1 } }
      );
    }

    // Create job with companyId for recruiters
    const jobData = { ...req.body, createdBy: req.user._id };
    if (req.user.role === 'recruiter' && req.user.companyId) {
      jobData.companyId = req.user.companyId;
    }

    const job = await Job.create(jobData);
    res.status(201).json({
      success: true,
      data: job,
      message: "Job created successfully"
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const listJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      source,
      type,
      location,
      company,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filters
    const filters = {
      $or: [
        { status: "open" }, // Manual jobs
        { isActive: true }  // Crawled jobs
      ]
    };

    // Apply additional filters
    if (source) {
      if (source === 'internal') {
        filters.source = { $in: ['internal', undefined, null] };
      } else {
        filters.source = source;
      }
    }
    
    if (type) filters.type = type;
    if (location) filters.location = new RegExp(location, 'i');
    if (company) filters.company = new RegExp(company, 'i');
    
    if (search) {
      filters.$and = [
        filters.$or,
        {
          $or: [
            { title: new RegExp(search, 'i') },
            { description: new RegExp(search, 'i') },
            { company: new RegExp(search, 'i') }
          ]
        }
      ];
      delete filters.$or;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const jobs = await Job.find(filters)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("createdBy", "name email")
      .lean();

    const total = await Job.countDocuments(filters);

    // Enhance jobs with additional metadata
    const enhancedJobs = jobs.map(job => ({
      ...job,
      isExternal: !!(job.source && job.source !== 'internal'),
      canApply: job.source === 'internal' || job.source === undefined || job.source === null || job.sourceUrl,
      applicationUrl: job.sourceUrl || null
    }));

    res.json({
      data: enhancedJobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      filters: {
        source,
        type,
        location,
        company,
        search
      }
    });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: "Unable to fetch jobs" });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("createdBy", "name email");
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: "Failed to get job" });
  }
};

// Apply to job (open to all authenticated users)
export const applyToJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Allow any authenticated user to apply to jobs
    const existing = await Application.findOne({ 
      jobId: req.params.id, 
      applicantId: req.user._id 
    });
    
    if (existing) {
      return res.status(400).json({ error: "Already applied to this job" });
    }

    const applicationData = {
      jobId: req.params.id,
      applicantId: req.user._id,
      userRole: req.user.role,
      resumeUrl: req.file ? `/api/files/resumes/${req.file.filename}` : null
    };

    // Allow any authenticated user to apply
    const application = await Application.create(applicationData);
    await Job.findByIdAndUpdate(req.params.id, { $inc: { applicationsCount: 1 } });

    res.status(201).json({ message: "Application submitted successfully", application });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.user._id }).populate("jobId");
    res.json({ data: apps });
  } catch (err) {
    res.status(500).json({ error: "Failed to get applications" });
  }
};

// Get jobs posted by user (open to all authenticated users)
export const getMyJobs = async (req, res) => {
  try {
    // Allow any authenticated user to view jobs
    const jobs = await Job.find({ createdBy: req.user._id })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get applications for a specific job (open to all authenticated users)
export const getJobApplications = async (req, res) => {
  try {
    // Allow any authenticated user to view applications
    const job = await Job.findById(req.params.id).populate("createdBy", "name email");
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Allow any authenticated user to view applications
    const applications = await Application.find({ jobId: req.params.id })
      .populate("applicantId", "name email profile")
      .sort({ appliedAt: -1 });

    res.json({ job, applications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update job status (open to all authenticated users)
export const updateJobStatus = async (req, res) => {
  try {
    // Allow any authenticated user to update jobs
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Allow any authenticated user to update job status
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    res.json(updatedJob);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete job (open to all authenticated users)
export const deleteJob = async (req, res) => {
  try {
    // Allow any authenticated user to delete jobs
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Allow any authenticated user to delete jobs
    await Job.findByIdAndDelete(req.params.id);
    await Application.deleteMany({ jobId: req.params.id });

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update application status (open to all authenticated users)
export const updateApplicationStatus = async (req, res) => {
  try {
    // Allow any authenticated user to update applications
    const application = await Application.findById(req.params.id)
      .populate("jobId", "title createdBy");
    
    if (!application) return res.status(404).json({ error: "Application not found" });

    // Allow any authenticated user to update application status
    application.status = req.body.status || application.status;
    application.notes = req.body.notes || application.notes;
    await application.save();

    res.json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Download resume for an application (open to all authenticated users)
export const downloadResume = async (req, res) => {
  try {
    // Allow any authenticated user to download resumes
    const application = await Application.findById(req.params.id)
      .populate("jobId", "title createdBy");
    
    if (!application) return res.status(404).json({ error: "Application not found" });

    // Allow any authenticated user to download resumes
    if (!application.resumeUrl) {
      return res.status(404).json({ error: "No resume found for this application" });
    }

    const filename = application.resumeUrl.split('/').pop();
    const filepath = path.join(process.cwd(), 'src', 'uploads', 'resumes', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: "Resume file not found" });
    }

    res.download(filepath, filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get job statistics
export const getJobStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalJobs,
      newToday,
      activeJobs,
      pendingJobs,
      expiredJobs,
      totalApplications
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ createdAt: { $gte: today } }),
      Job.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'pending_review' }),
      Job.countDocuments({ status: 'expired' }),
      Application.countDocuments()
    ]);

    // Get average salary (simplified calculation)
    const jobsWithSalary = await Job.find({ salary: { $exists: true, $ne: null } });
    let totalSalary = 0;
    let salaryCount = 0;
    
    jobsWithSalary.forEach(job => {
      if (typeof job.salary === 'string') {
        // Try to extract number from string salary
        const match = job.salary.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (match) {
          totalSalary += parseFloat(match[1].replace(/,/g, ''));
          salaryCount++;
        }
      } else if (job.salary && typeof job.salary === 'object') {
        if (job.salary.min) {
          totalSalary += job.salary.min;
          salaryCount++;
        }
      }
    });

    const averageSalary = salaryCount > 0 ? Math.round(totalSalary / salaryCount) : 0;

    // Get top companies
    const topCompanies = await Job.aggregate([
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { company: '$_id', _id: 0 } }
    ]);

    res.json({
      totalJobs,
      newToday,
      activeJobs,
      pendingJobs: pendingJobs,
      expiredJobs,
      averageSalary,
      totalApplications,
      topCompanies: topCompanies.map(tc => tc.company)
    });
  } catch (err) {
    console.error('Error fetching job stats:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all jobs for admin (including pending, expired, etc.)
export const getAdminAllJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      search,
      company,
      type,
      dateFrom,
      session,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Status filter
    if (status && status !== 'all') filter.status = status;
    
    // Source filter
    if (source && source !== 'all') filter.source = source;
    
    // Company filter
    if (company && company !== 'all') {
      filter.company = { $regex: company, $options: 'i' };
    }
    
    // Employment type filter
    if (type && type !== 'all') filter.type = type;
    
    // Date range filter (jobs created from specific date)
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0); // Start of day
      filter.createdAt = { $gte: fromDate };
    }
    
    // Session filter (based on creation time)
    if (session && session !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let startHour, endHour;
      switch (session) {
        case 'morning':
          startHour = 6;
          endHour = 12;
          break;
        case 'afternoon':
          startHour = 12;
          endHour = 18;
          break;
        case 'evening':
          startHour = 18;
          endHour = 24;
          break;
        default:
          startHour = 0;
          endHour = 24;
      }
      
      const sessionStart = new Date(today);
      sessionStart.setHours(startHour, 0, 0, 0);
      const sessionEnd = new Date(today);
      sessionEnd.setHours(endHour, 0, 0, 0);
      
      filter.createdAt = {
        ...filter.createdAt,
        $gte: sessionStart,
        $lt: sessionEnd
      };
    }
    
    // Search filter (title, company, location)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Admin jobs filter:', JSON.stringify(filter, null, 2));

    // Build sort
    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const jobs = await Job.find(filter)
      .populate("createdBy", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    console.log(`Found ${jobs.length} jobs out of ${total} total with filters`);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      appliedFilters: {
        status,
        source,
        company,
        type,
        dateFrom,
        session,
        search
      }
    });
  } catch (err) {
    console.error('Error fetching admin jobs:', err);
    res.status(500).json({ error: err.message });
  }
};