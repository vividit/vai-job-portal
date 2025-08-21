import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer") ? authHeader.split(" ")[1] : null;

  if (!token) return res.status(401).json({ error: "Not authorized, no token" });

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: "Invalid token" });
    
  }
  
};

