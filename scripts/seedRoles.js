import mongoose from "mongoose";
import Role from "../src/models/Role.js";
import connectDB from "../src/config/db.js";

const roles = [
  { roleId: "admin", roleTitle: "Admin" },
  { roleId: "recruiter", roleTitle: "Recruiter" },
  { roleId: "consultant", roleTitle: "Consultant" },
  { roleId: "jobseeker", roleTitle: "Job Seeker" }
];

const seedRoles = async () => {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Clear existing roles
    await Role.deleteMany({});
    console.log("🗑️ Cleared existing roles");

    // Insert new roles
    const insertedRoles = await Role.insertMany(roles);
    console.log("✅ Inserted roles:", insertedRoles.map(r => r.roleTitle));

    console.log("🎉 Roles seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
    process.exit(1);
  }
};

seedRoles(); 