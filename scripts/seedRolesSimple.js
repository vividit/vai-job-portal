import mongoose from "mongoose";

// Connect to MongoDB directly
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/meta-job-backend";

const roles = [
  { roleId: "admin", roleTitle: "Admin" },
  { roleId: "recruiter", roleTitle: "Recruiter" },
  { roleId: "consultant", roleTitle: "Consultant" },
  { roleId: "jobseeker", roleTitle: "Job Seeker" }
];

const roleSchema = new mongoose.Schema(
  {
    roleId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    roleTitle: { 
      type: String, 
      required: true 
    }
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", roleSchema);

const seedRoles = async () => {
  try {
    await mongoose.connect(MONGO_URI);
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