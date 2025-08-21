import Role from "../models/Role.js";

// Get all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ roleTitle: 1 });
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles"
    });
  }
};

// Create a new role
export const createRole = async (req, res) => {
  try {
    const { roleId, roleTitle } = req.body;
    
    if (!roleId || !roleTitle) {
      return res.status(400).json({
        success: false,
        message: "roleId and roleTitle are required"
      });
    }

    const existingRole = await Role.findOne({ roleId });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "Role with this roleId already exists"
      });
    }

    const role = new Role({ roleId, roleTitle });
    await role.save();

    res.status(201).json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create role"
    });
  }
};

// Update a role
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId, roleTitle } = req.body;

    const role = await Role.findByIdAndUpdate(
      id,
      { roleId, roleTitle },
      { new: true, runValidators: true }
    );

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update role"
    });
  }
};

// Delete a role
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByIdAndDelete(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    res.json({
      success: true,
      message: "Role deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete role"
    });
  }
}; 