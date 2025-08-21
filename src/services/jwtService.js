import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Generate JWT token
export const generateToken = (payload) => {
  try {
    console.log("Generating token with secret:", JWT_SECRET ? "Secret exists" : "No secret");
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    console.error("Token generation failed:", error);
    throw error;
  }
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    if (!token) {
      throw new Error("No token provided");
    }
    
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    console.log("Verifying token...");
    return jwt.verify(cleanToken, JWT_SECRET);
  } catch (error) {
    console.error("Token verification failed:", error.message);
    throw error;
  }
};

// Get user ID from token
export const getUserIdFromToken = (token) => {
  try {
    const decoded = verifyToken(token);
    return decoded.id || decoded.userId;
  } catch (error) {
    console.error("Failed to get user ID from token:", error);
    throw error;
  }
};
