import RegisteredCompany from "../models/RegisteredCompany.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Get all registered companies
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await RegisteredCompany.find().sort({ companyName: 1 });
    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch companies"
    });
  }
};

// Create a new company
export const createCompany = async (req, res) => {
  try {
    const { companyName, websiteURL, registrationId } = req.body;
    
    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: "companyName is required"
      });
    }

    const company = new RegisteredCompany({
      companyId: new mongoose.Types.ObjectId(),
      companyName,
      websiteURL,
      registrationId,
      status: 'pending'
    });
    
    await company.save();

    res.status(201).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create company"
    });
  }
};

// Onboard company for a recruiter
export const onboardCompany = async (req, res) => {
  try {
    const { 
      companyName, 
      websiteURL, 
      registrationId, 
      industry, 
      companySize, 
      description, 
      contactEmail, 
      contactPhone, 
      address, 
      city, 
      country 
    } = req.body;
    const recruiterId = req.user._id;
    
    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: "companyName is required"
      });
    }

    // Check if user is a recruiter
    const user = await User.findById(recruiterId);
    if (!user || user.role !== 'recruiter') {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can onboard companies"
      });
    }

    // Check if recruiter already has a company
    if (user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Recruiter already has a registered company"
      });
    }

    // Create new company
    const company = new RegisteredCompany({
      companyId: new mongoose.Types.ObjectId(),
      companyName,
      websiteURL,
      registrationId,
      industry,
      companySize,
      description,
      contactEmail,
      contactPhone,
      address,
      city,
      country,
      status: 'pending',
      recruiterName: user?.name || undefined
    });
    
    await company.save();

    // Update recruiter's profile with companyId
    await User.findByIdAndUpdate(recruiterId, {
      companyId: company.companyId
    });

    res.status(201).json({
      success: true,
      data: company,
      message: "Company onboarded successfully"
    });
  } catch (error) {
    console.error("Error onboarding company:", error);
    res.status(500).json({
      success: false,
      message: "Failed to onboard company"
    });
  }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await RegisteredCompany.findOne({ companyId: id });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch company"
    });
  }
};

// Update a company
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      companyName, 
      websiteURL, 
      registrationId, 
      industry, 
      companySize, 
      description, 
      contactEmail, 
      contactPhone, 
      address, 
      city, 
      country 
    } = req.body;

    const company = await RegisteredCompany.findOneAndUpdate(
      { companyId: id },
      { 
        companyName, 
        websiteURL, 
        registrationId, 
        industry, 
        companySize, 
        description, 
        contactEmail, 
        contactPhone, 
        address, 
        city, 
      country,
      status: req.body.status // allow admin to verify/reject
      },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update company"
    });
  }
};

// Delete a company
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await RegisteredCompany.findOneAndDelete({ companyId: id });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Remove companyId from all users who were linked to this company
    await User.updateMany(
      { companyId: id },
      { $unset: { companyId: 1 } }
    );

    res.json({
      success: true,
      message: "Company deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete company"
    });
  }
};

// Get recruiter's company
export const getRecruiterCompany = async (req, res) => {
  try {
    const recruiterId = req.user._id;
    
    // Find user and their company
    const user = await User.findById(recruiterId);
    if (!user || user.role !== 'recruiter') {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can access this endpoint"
      });
    }

    if (!user.companyId) {
      return res.status(404).json({
        success: false,
        message: "No company associated with this recruiter"
      });
    }

    const company = await RegisteredCompany.findOne({ companyId: user.companyId });
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error("Error fetching recruiter company:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch company"
    });
  }
};

// Verify/Reject company (Admin only)
export const verifyCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      rejectionReason, 
      verificationLevel = 'basic',
      recruiterPermissions = {},
      complianceChecks = {},
      subscriptionPlan = 'free',
      jobPostingLimit = 5
    } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can verify companies"
      });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'verified' or 'rejected'"
      });
    }

    const updateData = { 
      status,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      verificationLevel,
      subscriptionPlan
    };

    // Set permissions based on verification
    if (status === 'verified') {
      updateData.recruiterPermissions = {
        canPostJobs: true,
        canViewApplications: true,
        canManageJobs: true,
        canDownloadResumes: verificationLevel !== 'basic',
        ...recruiterPermissions
      };
      
      updateData.complianceChecks = {
        documentsVerified: true,
        contactVerified: true,
        websiteVerified: true,
        businessRegistrationVerified: verificationLevel !== 'basic',
        ...complianceChecks
      };

      // Set job posting quota based on plan
      const quotaLimits = {
        free: 5,
        basic: 20,
        premium: 100,
        enterprise: -1 // unlimited
      };
      
      updateData.jobPostingQuota = {
        used: 0,
        limit: quotaLimits[subscriptionPlan] || jobPostingLimit,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    } else {
      updateData.recruiterPermissions = {
        canPostJobs: false,
        canViewApplications: false,
        canManageJobs: false,
        canDownloadResumes: false
      };
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const company = await RegisteredCompany.findOneAndUpdate(
      { companyId: id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Send notification email to company (optional)
    if (status === 'verified') {
      // TODO: Send verification success email
    } else if (status === 'rejected') {
      // TODO: Send rejection email with reason
    }

    res.json({
      success: true,
      data: company,
      message: `Company ${status} successfully`
    });
  } catch (error) {
    console.error("Error verifying company:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify company"
    });
  }
};

// Get pending companies for admin review
export const getPendingCompanies = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can access pending companies"
      });
    }

    const companies = await RegisteredCompany.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'name email');

    res.json({
      success: true,
      data: companies,
      message: "Pending companies fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching pending companies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending companies"
    });
  }
};

// Update company permissions (Admin only)
export const updateCompanyPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { recruiterPermissions, jobPostingQuota, subscriptionPlan } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can update company permissions"
      });
    }

    const updateData = {};
    if (recruiterPermissions) updateData.recruiterPermissions = recruiterPermissions;
    if (jobPostingQuota) updateData.jobPostingQuota = jobPostingQuota;
    if (subscriptionPlan) updateData.subscriptionPlan = subscriptionPlan;

    const company = await RegisteredCompany.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    res.json({
      success: true,
      data: company,
      message: "Company permissions updated successfully"
    });
  } catch (error) {
    console.error("Error updating company permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update company permissions"
    });
  }
};

// Get company analytics (Admin only)
export const getCompanyAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can view company analytics"
      });
    }

    const analytics = await RegisteredCompany.aggregate([
      {
        $group: {
          _id: null,
          totalCompanies: { $sum: 1 },
          verifiedCompanies: { 
            $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] } 
          },
          pendingCompanies: { 
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } 
          },
          rejectedCompanies: { 
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } 
          },
          avgJobPostingQuotaUsed: { $avg: "$jobPostingQuota.used" }
        }
      }
    ]);

    // Get companies by subscription plan
    const subscriptionStats = await RegisteredCompany.aggregate([
      {
        $group: {
          _id: "$subscriptionPlan",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get companies by verification level
    const verificationStats = await RegisteredCompany.aggregate([
      {
        $group: {
          _id: "$verificationLevel",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {},
        subscriptionStats,
        verificationStats
      },
      message: "Company analytics fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching company analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch company analytics"
    });
  }
};

// Check company job posting quota
export const checkJobPostingQuota = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.params.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID required"
      });
    }

    const company = await RegisteredCompany.findById(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    const canPost = company.jobPostingQuota.limit === -1 || 
                   company.jobPostingQuota.used < company.jobPostingQuota.limit;

    res.json({
      success: true,
      data: {
        canPost,
        quota: company.jobPostingQuota,
        subscriptionPlan: company.subscriptionPlan,
        permissions: company.recruiterPermissions
      },
      message: "Job posting quota checked successfully"
    });
  } catch (error) {
    console.error("Error checking job posting quota:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check job posting quota"
    });
  }
}; 