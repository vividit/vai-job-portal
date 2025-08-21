import express from "express";
import {
  startCrawling,
  stopCrawling,
  quickCrawl,
  getCrawlingStatus,
  getJobById,
  getCrawledJobs,
  getCrawlingAnalytics,
  testScraper,
  cleanupJobs,
  updateJobStatus,
  getCrawlerConfig,
  getCrawlerSessions,
  getSessionDetails,
  getActivityFeed,
  startMultipleCrawlers,
  getCrawlerConfiguration,
  updateCrawlerConfiguration
} from "../controllers/crawlerController.js";
import { protect as authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/config", getCrawlerConfig);
router.get("/jobs", getCrawledJobs);
router.get("/jobs/:id", getJobById); // Get individual job details
router.get("/status", getCrawlingStatus);
router.get("/analytics", getCrawlingAnalytics); // Make analytics public for demo
router.get("/sessions", getCrawlerSessions); // Get crawler sessions
router.get("/sessions/:sessionId", getSessionDetails); // Get session details
router.get("/activity", getActivityFeed); // Real-time activity feed
router.get("/configuration", getCrawlerConfiguration); // Get crawler configuration
router.post("/start", startCrawling); // Enhanced crawling with session tracking
router.post("/start-multiple", startMultipleCrawlers); // Start multiple crawlers
router.post("/stop", stopCrawling); // Stop crawling
router.post("/quick", quickCrawl); // Quick crawl (10-15 jobs)
router.post("/test", testScraper); // Make test scraper public for demo

// Protected routes (authentication required)
router.use(authMiddleware);

// Admin and recruiter routes for other operations

// Admin-only routes
router.post("/cleanup", roleMiddleware(["admin"]), cleanupJobs);
router.patch("/jobs/:jobId/status", roleMiddleware(["admin"]), updateJobStatus);
router.put("/configuration", roleMiddleware(["admin"]), updateCrawlerConfiguration); // Update crawler configuration

export default router;
