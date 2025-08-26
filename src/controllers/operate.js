// src/controllers/operate.js
import Ajv from "ajv";
import { ObjectId } from "mongodb";

const ajv = new Ajv();

export default function makeOperate(db) {
  return async (req, res, next) => {
    try {
      const { operation: opName, data } = req.body;
      // 1) Load operation config
      const op = await db
        .collection("operations")
        .findOne({ name: opName, enabled: true });

      if (!op) 
        return res.status(404).json({ error: "Unknown operation" });

      // 2) Auth check
      if (op.requiresAuth && !req.user) 
        return res.status(401).json({ error: "Authentication required" });

      // 3) Role check
      if (op.allowedRoles?.length && !op.allowedRoles.includes(req.user.role))
        return res.status(403).json({ error: "Forbidden: insufficient role" });

      // 4) Custom email‑domain check (for operations like signupRecruiter)
      if (op.allowedEmailDomains && data.email) {
        const domain = data.email.split("@")[1]?.toLowerCase();
        if (!op.allowedEmailDomains.includes(domain)) {
          return res.status(400).json({ error: "Email domain not allowed" });
        }
      }

      // 5) Payload validation
      if (op.schema && !ajv.validate(op.schema, data))
        return res.status(400).json({ error: ajv.errors });

      const col = db.collection(op.collection);

      // 6) Dispatch by action
      switch (op.action) {
        case "findOne": {
          // cast string _id → ObjectId
          if (data._id) data._id = new ObjectId(data._id);
          const doc = await col.findOne(data, { projection: op.projection });
          return res.json({ result: doc });
        }

        case "createOne": {
          const ins = await col.insertOne(data);
          return res.json({ insertedId: ins.insertedId });
        }

        case "updateOne": {
          // cast and filter
          const id = new ObjectId(data._id);
          // strip out _id from update payload
          const { _id, ...rest } = data;
          const upd = await col.updateOne(
            { _id: id },
            { $set: rest }
          );
          return res.json({
            matched:  upd.matchedCount,
            modified: upd.modifiedCount
          });
        }

        // You can add deleteOne, aggregate, etc. here

        default:
          return res.status(400).json({ error: "Unsupported action" });
      }
    } catch (err) {
      console.error("Operate error:", err);
      next(err);
    }
  };
}
