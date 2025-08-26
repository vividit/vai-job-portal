// scripts/seed.js
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  const db = client.db();

  const ops = [
    {
      name: "updateProfile",
      collection: "users",
      action: "updateOne",
      requiresAuth: true,
      allowedRoles: ["user","admin"],
      schema: {
        type: "object",
        properties: {
          _id:      { type: "string" },
          fullName: { type: "string" },
          city:     { type: "string" }
        },
        required: ["_id"]
      },
      projection: { password: 0 },
      formConfig: [
        { name: "fullName", label: "Full Name", type: "text" },
        { name: "city",     label: "City",      type: "text" }
      ],
      enabled: true
    },
    {
      name: "changePassword",
      collection: "users",
      action: "updateOne",
      requiresAuth: true,
      allowedRoles: ["user","admin"],
      schema: {
        type: "object",
        properties: {
          _id:         { type: "string" },
          newPassword: { type: "string" }
        },
        required: ["_id","newPassword"]
      },
      formConfig: [
        { name: "newPassword", label: "New Password", type: "password" }
      ],
      enabled: true
    }
  ];

  for (let op of ops) {
    await db.collection("operations").updateOne(
      { name: op.name },
      { $set: op },
      { upsert: true }
    );
  }

  console.log("✅ Seed complete");
  await client.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
