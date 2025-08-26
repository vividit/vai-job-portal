import "./config/env.js"; // ✅
console.log("🔍 Loaded GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);

import express from "express";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import connectMongo from "connect-mongo";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import connectDB from "./config/db.js";
import "./config/passport.js"; // ✅ dotenv must load BEFORE this

// Route imports
import authRoutes from "./routes/auth.js";
import operateRoutes from "./routes/operate.js";
import userRoutes from "./routes/users.js";
import jobRoutes from "./routes/jobs.js";
import fileRoutes from "./routes/files.js";
import documentRoutes from "./routes/documents.js";
import configRoutes from "./routes/config.js";
import crawlerRoutes from "./routes/crawler.js";
import settingsRoutes from "./routes/settings.js";
import roleRoutes from "./routes/roles.js";
import queryRoutes from "./routes/queries.js";
import companyRoutes from "./routes/companies.js";
import profileRoutes from "./routes/profile.js";
import externalJobRoutes from "./routes/externalJobs.js";
import adminRoutes from "./routes/admin.js";
import { initializeScheduledCrawling } from "./controllers/crawlerController.js";
import { initializeDefaultCrawlers } from "./controllers/crawlerInstanceController.js";

// GridFS
import { connectGridFS } from "./utils/gridfs.js";

const app = express();

// ✅ Middlewares
app.use(cors({ 
  origin: process.env.CLIENT_URL || 'http://localhost:3000', 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use('/uploads', express.static('src/uploads'));

// ✅ OAuth Session Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }), // ✅ fixed
  })
);
// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/api/operate", operateRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/config", configRoutes);
app.use("/api/crawler", crawlerRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/queries", queryRoutes);
console.log('📋 Registering profile routes...');
app.use("/api/profile", profileRoutes);
console.log('✅ Profile routes registered successfully');
app.use("/api/external-jobs", externalJobRoutes);
console.log('✅ External job routes registered successfully');
app.use("/api/admin", adminRoutes);
console.log('✅ Admin routes registered successfully');

app.get("/", (req, res) => {
  res.send("🚀 Meta Job Backend is Running");
});

// ✅ MongoDB & GridFS Start
connectDB().then(() => {
  const conn = mongoose.connection;
  conn.once("open", () => {
    connectGridFS(conn);
    console.log("✅ GridFS Initialized");
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, async () => {
    console.log(`✅ Server listening on port ${PORT}`);
    
    // Initialize scheduled crawling
    initializeScheduledCrawling();
    console.log("🤖 Crawler scheduled tasks initialized");
    
    // Initialize default crawler instances
    await initializeDefaultCrawlers();
    console.log("🏭 Default crawler instances initialized");
  });
});
