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
  updateCrawlerConfiguration,
  enhancedCrawl,
  testRobotsCompliance
} from "../controllers/crawlerController.js";

import {
  getCrawlerInstances,
  createCrawlerInstance,
  updateCrawlerInstance,
  removeCrawlerInstance,
  startCrawlerInstance,
  stopCrawlerInstance
} from "../controllers/crawlerInstanceController.js";
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
router.post("/enhanced", enhancedCrawl); // Enhanced crawl with robots.txt compliance
router.post("/test-robots", testRobotsCompliance); // Test robots.txt compliance
// Simple test endpoint to verify connection
router.get("/test-connection", (req, res) => {
  res.json({ 
    success: true, 
    message: "Enhanced crawler endpoint is working!",
    timestamp: new Date().toISOString()
  });
});
router.post("/test", testScraper); // Make test scraper public for demo

// Crawler instance management routes (public read-only)
router.get("/instances", getCrawlerInstances); // Get all crawler instances

// Protected routes (authentication required)
router.use(authMiddleware);

// Admin and recruiter routes for other operations

// Crawler instance management routes (protected)
router.post("/instances", roleMiddleware(["admin"]), createCrawlerInstance); // Create new crawler instance
router.put("/instances/:crawlerId", roleMiddleware(["admin"]), updateCrawlerInstance); // Update crawler instance
router.delete("/instances/:crawlerId", roleMiddleware(["admin"]), removeCrawlerInstance); // Delete crawler instance
router.post("/instances/:crawlerId/start", roleMiddleware(["admin"]), startCrawlerInstance); // Start specific crawler
router.post("/instances/:crawlerId/stop", roleMiddleware(["admin"]), stopCrawlerInstance); // Stop specific crawler

// Admin-only routes
router.post("/cleanup", roleMiddleware(["admin"]), cleanupJobs);
router.patch("/jobs/:jobId/status", roleMiddleware(["admin"]), updateJobStatus);
router.put("/configuration", roleMiddleware(["admin"]), updateCrawlerConfiguration); // Update crawler configuration

// Crawler instance management routes (protected)
router.post("/instances", roleMiddleware(["admin"]), createCrawlerInstance); // Create new crawler instance
router.put("/instances/:crawlerId", roleMiddleware(["admin"]), updateCrawlerInstance); // Update crawler instance
router.delete("/instances/:crawlerId", roleMiddleware(["admin"]), removeCrawlerInstance); // Delete crawler instance
router.post("/instances/:crawlerId/start", roleMiddleware(["admin"]), startCrawlerInstance); // Start specific crawler
router.post("/instances/:crawlerId/stop", roleMiddleware(["admin"]), stopCrawlerInstance); // Stop specific crawler

// Debug endpoint to list all crawler instances
router.get("/debug/instances", roleMiddleware(["admin"]), async (req, res) => {
  try {
    const CrawlerInstance = (await import('../models/CrawlerInstance.js')).default;
    const allCrawlers = await CrawlerInstance.find({}).sort({ crawlerId: 1 });
    
    res.json({
      success: true,
      data: allCrawlers.map(c => ({
        id: c._id,
        crawlerId: c.crawlerId,
        name: c.name,
        isActive: c.isActive,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching debug crawler info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clean up orphaned crawler instances
router.post("/cleanup/instances", roleMiddleware(["admin"]), async (req, res) => {
  try {
    const CrawlerInstance = (await import('../models/CrawlerInstance.js')).default;
    
    // Remove any crawlers that might be corrupted or duplicated
    const result = await CrawlerInstance.deleteMany({ 
      $or: [
        { crawlerId: { $exists: false } },
        { crawlerId: null },
        { crawlerId: 2 } // Remove the problematic crawler ID 2
      ]
    });
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} crawler instances`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up crawler instances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add company to crawler instance
router.post("/instances/:crawlerId/companies", roleMiddleware(["admin"]), async (req, res) => {
  try {
    const { crawlerId } = req.params;
    const companyData = req.body;
    
    const CrawlerInstance = (await import('../models/CrawlerInstance.js')).default;
    
    const crawler = await CrawlerInstance.findOne({ crawlerId: parseInt(crawlerId) });
    if (!crawler) {
      return res.status(404).json({ success: false, error: 'Crawler not found' });
    }
    
    // Add the company to the crawler's companies array
    crawler.companies.push(companyData);
    await crawler.save();
    
    res.json({ success: true, data: crawler });
  } catch (error) {
    console.error('Error adding company to crawler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
