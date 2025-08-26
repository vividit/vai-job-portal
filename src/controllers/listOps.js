export default function makeListOps(db) {
  return async (req, res, next) => {
    try {
      const role = req.user?.role || "guest";
      const ops = await db.collection("operations").find(
        { allowedRoles: { $in: [role] }, enabled: true },
        { projection: { name:1, schema:1, formConfig:1 } }
      ).toArray();
      res.json({ operations: ops });
    } catch (err) { next(err); }
  };
}