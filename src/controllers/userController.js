import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Get current user
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// Admin - Create new user
export const createUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create users" });
    }

    const { name, email, password, role, status, companyId } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: "Name, email, and password are required" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters" 
      });
    }

    // Validate role
    const allowedRoles = ["jobseeker", "recruiter", "consultant", "admin"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: "Invalid role", 
        allowedRoles 
      });
    }

    // Validate status
    const allowedStatuses = ["active", "disabled"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: "Invalid status", 
        allowedStatuses 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Create user data
    const userData = {
      name,
      email,
      password,
      role: role || "jobseeker",
      status: status || "active"
    };

    // Add companyId if user is recruiter and companyId is provided
    if (userData.role === "recruiter" && companyId) {
      userData.companyId = companyId;
    }

    const user = await User.create(userData);
    
    // Return user without password
    const userResponse = await User.findById(user._id).select("-password");

    res.status(201).json({
      message: "User created successfully",
      data: userResponse
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// Admin - get all users
export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    const users = await User.find().select("-password");
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Update user profile (self or admin updating others)
export const updateUser = async (req, res) => {
  try {
    const updates = req.body;
    
    // Determine which user to update
    let targetUserId;
    
    if (req.params.id && req.params.id !== 'me') {
      // Admin updating another user by ID
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized to update other users" });
      }
      targetUserId = req.params.id;
    } else {
      // User updating their own profile (including /me route)
      targetUserId = req.user.id;
    }
    
    // Prevent non-admins from changing sensitive fields
    if (req.user.role !== "admin" && (updates.role || updates.status)) {
      return res.status(403).json({ error: "Unauthorized to change role or status" });
    }
    
    const user = await User.findByIdAndUpdate(targetUserId, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.json({ data: user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// Admin - Reset user password
export const resetUserPassword = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can reset passwords" });
    }

    const { newPassword } = req.body;
    const { userId } = req.params;

    // Validation
    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters" 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent admin from resetting their own password through this endpoint
    if (userId === req.user.id) {
      return res.status(400).json({ 
        error: "Use the profile update endpoint to change your own password" 
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({ 
      message: "Password reset successfully",
      userId: userId
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

// Admin - Change user password (alternative endpoint)
export const changeUserPassword = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can change user passwords" });
    }

    const { password } = req.body;
    const { id } = req.params;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters" 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update password (will be hashed by the pre-save middleware)
    user.password = password;
    await user.save();

    res.json({ 
      message: "User password updated successfully",
      userId: id
    });
  } catch (error) {
    console.error("Change user password error:", error);
    res.status(500).json({ error: "Failed to change user password" });
  }
};

// Admin delete user
export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
    
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ 
        error: "Cannot delete your own admin account" 
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if this is the last admin user
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: "Cannot delete the last admin user" 
        });
      }
    }

    await User.findByIdAndDelete(userId);
    res.json({ 
      message: "User deleted successfully",
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

// Admin - Change user role
export const changeUserRole = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can change user roles" });
    }

    const { role } = req.body;
    const { userId } = req.params;

    // Validate role
    const allowedRoles = ["jobseeker", "recruiter", "consultant", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: "Invalid role", 
        allowedRoles 
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({ 
        error: "Cannot change your own role" 
      });
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      { role }, 
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ 
      message: "User role updated successfully",
      data: user 
    });
  } catch (error) {
    console.error("Change user role error:", error);
    res.status(500).json({ error: "Failed to change user role" });
  }
};

// Get users by role
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    // Only admins and consultants can view users by role
    if (!["admin", "consultant"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const allowedRoles = ["jobseeker", "recruiter", "consultant", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: "Invalid role", 
        allowedRoles 
      });
    }

    const users = await User.find({ role }).select("-password");
    res.json({ 
      data: users,
      count: users.length,
      role 
    });
  } catch (error) {
    console.error("Get users by role error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    if (!["admin", "consultant"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          disabled: {
            $sum: { $cond: [{ $eq: ["$status", "disabled"] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });

    res.json({
      data: {
        totalUsers,
        activeUsers,
        roleBreakdown: stats,
        summary: {
          jobseekers: stats.find(s => s._id === "jobseeker")?.count || 0,
          recruiters: stats.find(s => s._id === "recruiter")?.count || 0,
          consultants: stats.find(s => s._id === "consultant")?.count || 0,
          admins: stats.find(s => s._id === "admin")?.count || 0
        }
      }
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
};
