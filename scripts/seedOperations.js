// scripts/seedOperations.js
import mongoose from "mongoose";
import dotenv   from "dotenv";
dotenv.config();

/* ---------- Mongo connection ---------- */
const MONGO_URI = process.env.MONGO_URI;
const dbName    = MONGO_URI.split("/").pop().split("?")[0];

/* ---------- Operation documents ---------- */
const operations = [
  /* ── Users ─────────────────────────── */
  {
    name: "getUser",
    action: "findOne",
    collection: "User",           // ← model name
    allowedRoles: ["admin", "jobseeker", "recruiter", "consultant"],
    requiresAuth: true,
    enabled: true,
    projection: { password: 0 }
  },
  {
    name: "listUsers",
    action: "findMany",
    collection: "User",
    allowedRoles: ["admin"],
    requiresAuth: true,
    enabled: true,
    projection: { password: 0 }
  },
  {
    name: "updateUserProfile",
    action: "updateOne",
    collection: "User",
    allowedRoles: ["jobseeker", "recruiter", "consultant"],
    requiresAuth: true,
    enabled: true,
    formConfig: [
      { field: "profile.resumeHeadline", type: "text", label: "Resume Headline" },
      { field: "profile.location",      type: "text", label: "Location" },
      { field: "profile.skills",        type: "text", label: "Skills (comma‑sep)" }
    ]
  },
  {
    name: "updateUserRole",
    action: "updateOne",
    collection: "User",
    allowedRoles: ["admin"],
    requiresAuth: true,
    enabled: true,
    formConfig: [
      { field: "filter._id",     type: "text",   label: "User ID", required: true },
      { field: "update.role",    type: "select", label: "Role",
        options: ["jobseeker","recruiter","consultant","admin"], required: true }
    ]
  },
  {
    name: "toggleUserStatus",
    action: "updateOne",
    collection: "User",
    allowedRoles: ["admin"],
    requiresAuth: true,
    enabled: true,
    formConfig: [
      { field: "filter._id",     type: "text",   label: "User ID", required: true },
      { field: "update.status",  type: "select", label: "Status",
        options: ["active","disabled"], required: true }
    ]
  },

  /* ── Jobs ─────────────────────────── */
  {
    name: "createJob",
    action: "insertOne",
    collection: "Job",
    allowedRoles: ["recruiter", "admin"],
    requiresAuth: true,
    enabled: true,
    formConfig: [
      { field: "title",       type: "text",     label: "Job Title", required: true },
      { field: "company",     type: "text",     label: "Company",   required: true },
      { field: "location",    type: "text",     label: "Location" },
      { field: "type",        type: "select",   label: "Type",
        options: ["full-time","part-time","remote"], required: true },
      { field: "salary",      type: "number",   label: "Salary" },
      { field: "description", type: "textarea", label: "Description" }
    ]
  },
  {
    name: "listJobs",
    action: "findMany",
    collection: "Job",
    allowedRoles: ["admin","recruiter","jobseeker","consultant"],
    requiresAuth: false,
    enabled: true
  },

  /* ── Applications ────────────────── */
  {
    name: "applyToJob",
    action: "insertOne",
    collection: "Application",
    allowedRoles: ["jobseeker"],
    requiresAuth: true,
    enabled: true,
    formConfig: [
      { field: "jobId",       type: "text",     label: "Job ID", required: true },
      { field: "coverLetter", type: "textarea", label: "Cover Letter" }
    ]
  }
];

/* ---------- Seeder ---------- */
async function seed() {
  try {
    await mongoose.connect(MONGO_URI, { dbName });

    const opColl = mongoose.connection.db.collection("operations");
    await opColl.deleteMany({});
    await opColl.insertMany(operations);

    console.log(`✅  Seeded ${operations.length} operations.`);
    process.exit(0);
  } catch (err) {
    console.error("❌  Seeder error:", err);
    process.exit(1);
  }
}

seed();
