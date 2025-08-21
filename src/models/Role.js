import mongoose from "mongoose";

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

export default mongoose.model("Role", roleSchema); 