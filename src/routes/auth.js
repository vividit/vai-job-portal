import express from "express";
import passport from "passport";
import { loginUser, registerUser, oauthSuccess, getCurrentUser } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Local
router.post("/login", loginUser);
router.post("/register", registerUser);

// Get current user
router.get("/me", protect, getCurrentUser);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  oauthSuccess
);

// GitHub OAuth
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  oauthSuccess
);

export default router;
