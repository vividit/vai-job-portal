import mongoose from "mongoose";

const OperationSchema = new mongoose.Schema({
  name:         { type:String, unique:true, required:true },
  collection:   { type:String, required:true },
  action:       { type:String, required:true },
  requiresAuth: { type:Boolean, default:false },
  allowedRoles: [String],
  schema:       Object,
  formConfig:   Object,
  projection:   Object,
  enabled:      { type:Boolean, default:true }
});

export default mongoose.model("Operation", OperationSchema);