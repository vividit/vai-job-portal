// src/controllers/operateController.js
import Operation from "../models/Operation.js";
import mongoose   from "mongoose";

export const handleOperation = async (req, res) => {
  /* ----------------------------------------------------
     1.  Normalise request body keys
  ---------------------------------------------------- */
  const opName  = req.body.name      || req.body.operation;
  const payload = req.body.payload   || req.body.data || {};

  try {
    /* ----------------------------------------------------
       2.  Fetch operation definition from DB
    ---------------------------------------------------- */
    const op = await Operation.findOne({ name: opName, enabled: true });
    if (!op)                        return res.status(404).json({ error: "Operation not found" });
    if (op.requiresAuth && !req.user) return res.status(401).json({ error: "Auth required" });
    if (!op.allowedRoles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });

    const Model  = mongoose.model(op.collection);
    let   result;

    /* ----------------------------------------------------
       3.  Execute action
    ---------------------------------------------------- */
    switch (op.action) {
      case "findOne":
        result = await Model.findOne(payload.filter || {}, op.projection || {});
        break;

      case "findMany":
        result = await Model.find(payload.filter || {}, op.projection || {});
        break;

      case "insertOne":
        result = await Model.create(payload.data || {});
        break;

      case "updateOne":
        result = await Model.updateOne(payload.filter || {}, payload.update || {});
        break;

      case "deleteOne":
        result = await Model.deleteOne(payload.filter || {});
        break;

      default:
        return res.status(400).json({ error: "Invalid action in operation config" });
    }

    /* ----------------------------------------------------
       4.  Return unified success response
    ---------------------------------------------------- */
    res.json({ success: true, data: result });

  } catch (err) {
    console.error("operateController error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
