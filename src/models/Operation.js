import mongoose from "mongoose";

const operationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  action: { type: String, enum: ["findOne", "findMany", "insertOne", "updateOne", "deleteOne"], required: true },
  collection: { type: String, required: true },
  allowedRoles: [{ type: String, required: true }],
  requiresAuth: { type: Boolean, default: true },
  enabled: { type: Boolean, default: true },
  formConfig: [
    {
      field: { type: String, required: true },
      type: { type: String, default: "text" },
      required: { type: Boolean, default: false }
    }
  ],
  projection: { type: Object, default: {} },
  schema: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.model("Operation", operationSchema);
