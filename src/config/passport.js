import "../config/env.js"; // ✅ Ensures .env is ready here
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";

// Debug log
console.log("📦 passport.js: GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ── Google Strategy ─────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existing = await User.findOne({ oauthId: profile.id, oauthProvider: "google" });
        if (existing) return done(null, existing);

        const user = await User.create({
          name: profile.displayName,
          email: profile.emails?.[0]?.value || "",
          oauthProvider: "google",
          oauthId: profile.id,
          role: "jobseeker",
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

// ── GitHub Strategy ─────────────────────────────
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/auth/github/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existing = await User.findOne({ oauthId: profile.id, oauthProvider: "github" });
        if (existing) return done(null, existing);

        const user = await User.create({
          name: profile.username || "NoName",
          email: profile.emails?.[0]?.value || "",
          oauthProvider: "github",
          oauthId: profile.id,
          role: "jobseeker",
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

export default passport;
