import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function auth(req, res, next) {
  const auth = req.headers.authorization?.split(" ")[1];
  if (!auth) return next();
  try {
    const { userId } = jwt.verify(auth, process.env.JWT_SECRET);
    req.user = await User.findById(userId).lean();
  } catch {}
  next();
}