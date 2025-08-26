import crawlerService from '../services/crawlerService.js';
import Job from '../models/Job.js';
import CrawlerSession from '../models/CrawlerSession.js';
import CrawlerConfiguration from '../models/CrawlerConfiguration.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Start advanced crawling with session management
export const startCrawling = async (req, res) => {
  try {
    const {
      searchTerms = ['software engineer'],
      locations = ['remote'],
      sources = ['linkedin', 'indeed'],
      companies = [],
      crawlerInstance = 1,
      immediate = false,
      maxJobs = 20,
      configuration = null
    } = req.body;

    const sessionId = uuidv4();
    const userId = req.user?._id;

    // Create crawler session
    const session = new CrawlerSession({
      sessionId,
      crawlerInstance,
      configuration: {
        sources,
        companies,
        searchTerms,
        locations,
        maxJobs,
        filters: configuration?.filters || {}
      },
      createdBy: userId,
      progress: {
        currentStep: 'Initializing',
        stepsCompleted: 0,
        totalSteps: sources.length * searchTerms.length,
        currentSource: '',
        currentCompany: ''
      }
    });

    await session.save();

    logger.info(`Crawler C${crawlerInstance} session ${sessionId} initiated by:`, req.user?.email || 'System');
    
    if (immediate) {
      // Start crawling immediately with session tracking
      const result = await crawlerService.crawlJobsWithSession({
        sessionId,
        searchTerms: searchTerms.slice(0, 2),
        locations: locations.slice(0, 2),
        sources: sources.slice(0, 3),
        companies: companies.slice(0, 10),
        maxJobs: Math.min(maxJobs, 50),
        crawlerInstance
      });

      return res.json({
        success: true,
        message: `Crawler C${crawlerInstance} completed: ${result.totalJobs} jobs found`,
        data: {
          ...result,
          sessionId,
          crawlerInstance,
          limits: {
            maxJobs: Math.min(maxJobs, 50),
            searchTerms: searchTerms.slice(0, 2),
            locations: locations.slice(0, 2),
            sources: sources.slice(0, 3)
          }
        }
      });
    } else {
      // Start crawling in background with session tracking
      crawlerService.crawlJobsWithSession({
        sessionId,
        searchTerms: searchTerms.slice(0, 2),
        locations: locations.slice(0, 2),
        sources: sources.slice(0, 3),
        companies: companies.slice(0, 10),
        maxJobs: Math.min(maxJobs, 50),
        crawlerInstance
      }).then(result => {
        logger.info(`Crawler C${crawlerInstance} background session completed:`, result);
      }).catch(async (error) => {
        logger.error(`Crawler C${crawlerInstance} session failed:`, error);
        await session.complete('failed');
      });

      return res.json({
        success: true,
        message: `Crawler C${crawlerInstance} started in background`,
        data: { 
          sessionId,
          crawlerInstance,
          status: 'started',
          limits: {
            maxJobs: Math.min(maxJobs, 50),
            sources: sources.slice(0, 3)
          }
        }
      });
    }

  } catch (error) {
    logger.error('Error starting crawl:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Stop crawling
export const stopCrawling = async (req, res) => {
  try {
    logger.info('Stop crawling requested by:', req.user?.email || 'System');
    
    const result = crawlerService.stopCrawling();
    
    res.json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    logger.error('Error stopping crawl:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Quick crawl (10-15 jobs only)
export const quickCrawl = async (req, res) => {
  try {
    const {
      source = 'linkedin',
      searchTerm = 'software engineer'
    } = req.body;

    logger.info(`Quick crawl initiated: ${source} for "${searchTerm}"`);

    const result = await crawlerService.crawlJobs({
      searchTerms: [searchTerm],
      locations: ['remote'],
      sources: [source],
      maxJobs: 15 // Quick crawl limit
    });

    res.json({
      success: true,
      message: `Quick crawl completed: ${result.totalJobs} jobs from ${source}`,
      data: {
        ...result,
        mode: 'quick',
        source,
        searchTerm
      }
    });

  } catch (error) {
    logger.error('Error in quick crawl:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Enhanced crawl with robots.txt compliance and structured data extraction
export const enhancedCrawl = async (req, res) => {
  try {
    console.log('🚀 Enhanced crawl endpoint hit!');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const {
      urls = [],
      searchTerms = ['software engineer'],
      locations = ['remote'],
      sources = ['linkedin', 'indeed'],
      maxJobsPerSource = 25,
      respectRobots = true,
      crawlDelay = 1000,
      saveToDatabase = true
    } = req.body;

    const sessionId = uuidv4();
    const userId = req.user?._id;

    console.log('📊 Enhanced crawl config:', {
      sessionId,
      userId,
      sources,
      searchTerms,
      locations,
      maxJobsPerSource,
      respectRobots
    });

    logger.info(`Enhanced crawl initiated by ${req.user?.email || 'System'} with session ${sessionId}`);

    // Create crawler session
    const session = new CrawlerSession({
      sessionId,
      crawlerInstance: 999, // Use 999 to distinguish enhanced crawler from C1-C4
      configuration: {
        sources,
        searchTerms,
        locations,
        maxJobsPerSource,
        respectRobots,
        crawlDelay,
        urls
      },
      createdBy: userId,
      progress: {
        currentStep: 'Initializing Enhanced Crawl',
        stepsCompleted: 0,
        totalSteps: sources.length * searchTerms.length + urls.length,
        currentSource: '',
        currentCompany: ''
      }
    });

    await session.save();

    // Start enhanced crawling
    const structuredJobs = await crawlerService.crawlJobsEnhanced({
      urls,
      searchTerms,
      locations,
      sources,
      maxJobsPerSource,
      respectRobots,
      crawlDelay
    });

    let saveResults = null;
    if (saveToDatabase && structuredJobs.length > 0) {
      saveResults = await crawlerService.saveExtractedJobs(structuredJobs);
    }

    // Update session completion
    await session.complete('completed');
    
    // Update session statistics
    session.statistics.totalJobsFound = structuredJobs.length;
    session.statistics.jobsSaved = saveResults?.saved || 0;
    await session.save();

    // Update crawler instance statistics
    if (crawlerInstance) {
      try {
        const CrawlerInstance = (await import('../models/CrawlerInstance.js')).default;
        const crawler = await CrawlerInstance.findOne({ crawlerId: parseInt(crawlerInstance) });
        
        if (crawler) {
          crawler.statistics.totalRuns += 1;
          crawler.statistics.totalJobsFound += structuredJobs.length;
          crawler.statistics.totalJobsSaved += (saveResults?.saved || 0);
          crawler.statistics.lastRunAt = new Date();
          
          // Update average run time
          const sessionDuration = session.getExecutionTime();
          if (sessionDuration > 0) {
            const totalRunTime = crawler.statistics.averageRunTime * (crawler.statistics.totalRuns - 1) + sessionDuration;
            crawler.statistics.averageRunTime = Math.round(totalRunTime / crawler.statistics.totalRuns);
          }
          
          await crawler.save();
          console.log(`✅ Updated crawler ${crawlerInstance} statistics: ${structuredJobs.length} jobs found, ${saveResults?.saved || 0} saved`);
        }
      } catch (error) {
        console.error('❌ Error updating crawler instance statistics:', error);
      }
    }

    const response = {
      success: true,
      message: `Enhanced crawl completed: ${structuredJobs.length} jobs extracted`,
      data: {
        sessionId,
        totalJobsExtracted: structuredJobs.length,
        structuredJobs: structuredJobs.slice(0, 10), // Return first 10 for preview
        saveResults,
        robotsCompliance: respectRobots,
        configuration: {
          sources,
          searchTerms,
          locations,
          maxJobsPerSource,
          urls: urls.length
        }
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Error in enhanced crawl:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Test robots.txt compliance for a URL
export const testRobotsCompliance = async (req, res) => {
  try {
    const { url, userAgent = 'JobCrawler/1.0' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const robotsChecker = (await import('../utils/robotsChecker.js')).default;
    
    const isAllowed = await robotsChecker.robotsAllowed(url, userAgent);
    const crawlDelay = await robotsChecker.getCrawlDelay(url, userAgent);

    res.json({
      success: true,
      data: {
        url,
        userAgent,
        crawlingAllowed: isAllowed,
        crawlDelay,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error testing robots compliance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get crawling status
export const getCrawlingStatus = async (req, res) => {
  try {
    const status = crawlerService.getStatus();
    
    // Get recent crawling statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Job.aggregate([
      {
        $match: {
          crawledAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          lastCrawled: { $max: '$crawledAt' }
        }
      }
    ]);

    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        ...status,
        statistics: {
          totalJobs,
          activeJobs,
          sourceBreakdown: stats,
          lastCrawlTime: stats.length > 0 ? 
            Math.max(...stats.map(s => new Date(s.lastCrawled).getTime())) : null
        }
      }
    });

  } catch (error) {
    logger.error('Error getting crawling status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get individual job by ID
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id).select('-__v').lean();
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    logger.error('Error getting job by ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get crawled jobs with filters
export const getCrawledJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      source,
      searchTerm,
      location,
      type,
      company,
      sortBy = 'crawledAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = { isActive: true };

    // Apply filters
    if (source) filters.source = source;
    if (type) filters.type = type;
    if (company) filters.company = new RegExp(company, 'i');
    if (location) filters.location = new RegExp(location, 'i');
    if (searchTerm) {
      filters.$or = [
        { title: new RegExp(searchTerm, 'i') },
        { description: new RegExp(searchTerm, 'i') },
        { company: new RegExp(searchTerm, 'i') }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const jobs = await Job.find(filters)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v')
      .lean();

    const total = await Job.countDocuments(filters);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting crawled jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get crawling analytics
export const getCrawlingAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Jobs by source
    const jobsBySource = await Job.aggregate([
      {
        $match: {
          crawledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Jobs by type
    const jobsByType = await Job.aggregate([
      {
        $match: {
          crawledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Daily crawling trend
    const dailyTrend = await Job.aggregate([
      {
        $match: {
          crawledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$crawledAt' },
            month: { $month: '$crawledAt' },
            day: { $dayOfMonth: '$crawledAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Top companies
    const topCompanies = await Job.aggregate([
      {
        $match: {
          crawledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$company',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Popular locations
    const popularLocations = await Job.aggregate([
      {
        $match: {
          crawledAt: { $gte: startDate },
          location: { $ne: 'Not specified' }
        }
      },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        jobsBySource,
        jobsByType,
        dailyTrend,
        topCompanies,
        popularLocations
      }
    });

  } catch (error) {
    logger.error('Error getting crawling analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Test individual scraper
export const testScraper = async (req, res) => {
  try {
    const { source, searchTerm = 'software engineer', location = 'remote' } = req.body;

    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source is required'
      });
    }

    logger.info(`Testing ${source} scraper`);

    let jobs = [];
    
    switch (source.toLowerCase()) {
      case 'indeed':
        jobs = await crawlerService.scrapeIndeed(searchTerm, location, 5);
        break;
      case 'linkedin':
        jobs = await crawlerService.scrapeLinkedIn(searchTerm, location, 5);
        break;
      case 'remoteok':
        jobs = await crawlerService.scrapeRemoteOK(searchTerm, 5);
        break;
      case 'wellfound':
        jobs = await crawlerService.scrapeAngelList(searchTerm, 5);
        break;
      case 'adobe':
        const apiCrawlerService = (await import('../services/apiCrawlerService.js')).default;
        jobs = await apiCrawlerService.scrapeAdobeJobs(searchTerm, location, 5);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid source. Supported: indeed, linkedin, remoteok, wellfound, adobe'
        });
    }

    res.json({
      success: true,
      data: {
        source,
        searchTerm,
        location,
        jobsFound: jobs.length,
        jobs: jobs.slice(0, 3) // Return first 3 jobs as sample
      }
    });

  } catch (error) {
    logger.error('Error testing scraper:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Cleanup old jobs
export const cleanupJobs = async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    
    logger.info(`Cleaning up jobs older than ${daysOld} days`);
    
    const deletedCount = await crawlerService.cleanupOldJobs();
    
    res.json({
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} old jobs`
      }
    });

  } catch (error) {
    logger.error('Error cleaning up jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update job status (activate/deactivate)
export const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { isActive } = req.body;

    const job = await Job.findByIdAndUpdate(
      jobId,
      { isActive, updatedAt: new Date() },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    logger.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get crawler configuration
export const getCrawlerConfig = async (req, res) => {
  try {
    const config = {
      supportedSources: ['indeed', 'linkedin', 'remoteok', 'wellfound', 'adobe'],
      defaultSearchTerms: ['software engineer', 'data scientist', 'product manager', 'designer'],
      defaultLocations: ['remote', 'san francisco', 'new york', 'london'],
      scheduledCrawling: {
        enabled: true,
        frequency: 'Every 6 hours',
        nextRun: 'Calculated based on cron schedule'
      },
      limits: {
        maxJobsPerSource: 50,
        maxSearchTerms: 10,
        maxLocations: 5
      }
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('Error getting crawler config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get crawler sessions with real-time data
export const getCrawlerSessions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      crawlerInstance = 'all',
      dateFrom,
      dateTo
    } = req.query;

    const filters = {};
    
    if (status !== 'all') {
      filters.status = status;
    }
    
    if (crawlerInstance !== 'all') {
      filters.crawlerInstance = parseInt(crawlerInstance);
    }
    
    if (dateFrom || dateTo) {
      filters.startTime = {};
      if (dateFrom) filters.startTime.$gte = new Date(dateFrom);
      if (dateTo) filters.startTime.$lte = new Date(dateTo);
    }

    const sessions = await CrawlerSession.find(filters)
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'email name')
      .lean();

    const total = await CrawlerSession.countDocuments(filters);

    // Add real-time analytics
    const analytics = await CrawlerSession.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalJobsFetched: { $sum: '$statistics.totalJobsFound' },
          avgExecutionTime: { $avg: '$statistics.executionTime' },
          companiesFetched: { $sum: '$statistics.companiesFetched' },
          titlesFetched: { $sum: '$statistics.titlesFetched' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        sessions,
        analytics: analytics[0] || {
          totalSessions: 0,
          completedSessions: 0,
          failedSessions: 0,
          totalJobsFetched: 0,
          avgExecutionTime: 0,
          companiesFetched: 0,
          titlesFetched: 0
        },
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting crawler sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get live session details
export const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await CrawlerSession.findOne({ sessionId })
      .populate('createdBy', 'email name')
      .lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get related jobs
    const jobs = await Job.find({
      crawledAt: {
        $gte: session.startTime,
        $lte: session.endTime || new Date()
      },
      source: { $in: session.configuration.sources }
    })
    .sort({ crawledAt: -1 })
    .limit(50)
    .lean();

    res.json({
      success: true,
      data: {
        session,
        jobs,
        realTimeStats: {
          currentProgress: session.progress,
          jobsPerMinute: session.statistics.executionTime > 0 
            ? Math.round(session.statistics.totalJobsFound / (session.statistics.executionTime / 60))
            : 0,
          successRate: session.results.length > 0 
            ? Math.round((session.statistics.jobsSaved / session.results.length) * 100)
            : 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting session details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get real-time activity feed
export const getActivityFeed = async (req, res) => {
  try {
    const { limit = 50, since } = req.query;
    
    const filters = {};
    if (since) {
      filters.startTime = { $gte: new Date(since) };
    }

    // Get recent sessions with their notifications
    const sessions = await CrawlerSession.find(filters)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .select('sessionId crawlerInstance status startTime endTime progress notifications statistics')
      .lean();

    // Build activity feed
    const activities = [];

    sessions.forEach(session => {
      // Add session start activity
      activities.push({
        id: `session-start-${session.sessionId}`,
        type: 'session_start',
        timestamp: session.startTime,
        message: `Crawler C${session.crawlerInstance} started session`,
        data: {
          sessionId: session.sessionId,
          crawlerInstance: session.crawlerInstance,
          status: session.status
        }
      });

      // Add notifications
      session.notifications?.forEach(notification => {
        activities.push({
          id: `notification-${session.sessionId}-${notification.timestamp}`,
          type: 'notification',
          timestamp: notification.timestamp,
          message: notification.message,
          level: notification.type,
          data: {
            sessionId: session.sessionId,
            crawlerInstance: session.crawlerInstance
          }
        });
      });

      // Add session completion
      if (session.endTime) {
        activities.push({
          id: `session-end-${session.sessionId}`,
          type: 'session_complete',
          timestamp: session.endTime,
          message: `Crawler C${session.crawlerInstance} completed: ${session.statistics.totalJobsFound} jobs found`,
          data: {
            sessionId: session.sessionId,
            crawlerInstance: session.crawlerInstance,
            status: session.status,
            jobsFound: session.statistics.totalJobsFound,
            duration: session.statistics.executionTime
          }
        });
      }
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        activities: activities.slice(0, parseInt(limit)),
        lastUpdate: new Date(),
        hasMore: activities.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Error getting activity feed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Start multiple crawlers in parallel
export const startMultipleCrawlers = async (req, res) => {
  try {
    const { 
      crawlers = [
        { instance: 1, companies: [], searchTerms: ['software engineer'] },
        { instance: 2, companies: [], searchTerms: ['data scientist'] },
        { instance: 3, companies: [], searchTerms: ['product manager'] },
        { instance: 4, companies: [], searchTerms: ['designer'] }
      ]
    } = req.body;

    const sessions = [];
    const promises = [];

    for (const crawler of crawlers) {
      const sessionId = uuidv4();
      const session = new CrawlerSession({
        sessionId,
        crawlerInstance: crawler.instance,
        configuration: {
          sources: crawler.sources || ['remoteok', 'indeed'],
          companies: crawler.companies || [],
          searchTerms: crawler.searchTerms || ['software engineer'],
          locations: crawler.locations || ['remote'],
          maxJobs: crawler.maxJobs || 25,
          filters: crawler.filters || {}
        },
        createdBy: req.user?._id,
        progress: {
          currentStep: 'Initializing',
          stepsCompleted: 0,
          totalSteps: (crawler.sources?.length || 2) * (crawler.searchTerms?.length || 1),
          currentSource: '',
          currentCompany: ''
        }
      });

      await session.save();
      sessions.push({ sessionId, crawlerInstance: crawler.instance });

      // Start crawler in background
      const promise = crawlerService.crawlJobsWithSession({
        sessionId,
        searchTerms: crawler.searchTerms || ['software engineer'],
        locations: crawler.locations || ['remote'],
        sources: crawler.sources || ['remoteok', 'indeed'],
        companies: crawler.companies || [],
        maxJobs: crawler.maxJobs || 25,
        crawlerInstance: crawler.instance
      });

      promises.push(promise);
    }

    // Don't wait for all to complete, return immediately
    Promise.allSettled(promises).then(results => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`Crawler C${crawlers[index].instance} failed:`, result.reason);
        } else {
          logger.info(`Crawler C${crawlers[index].instance} completed:`, result.value);
        }
      });
    });

    res.json({
      success: true,
      message: `Started ${crawlers.length} crawler instances`,
      data: {
        sessions,
        totalCrawlers: crawlers.length,
        status: 'started'
      }
    });

  } catch (error) {
    logger.error('Error starting multiple crawlers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Manage crawler configuration
export const getCrawlerConfiguration = async (req, res) => {
  try {
    const config = await CrawlerConfiguration.findOne({ name: 'default' }) || 
      new CrawlerConfiguration({
        name: 'default',
        description: 'Default crawler configuration',
        sources: {
          jobSites: [
            { name: 'Indeed', url: 'indeed.com', isActive: true, priority: 'high', category: 'general' },
            { name: 'LinkedIn', url: 'linkedin.com', isActive: true, priority: 'high', category: 'professional' },
            { name: 'RemoteOK', url: 'remoteok.io', isActive: true, priority: 'medium', category: 'remote' },
            { name: 'Wellfound', url: 'wellfound.com', isActive: true, priority: 'medium', category: 'startup' }
          ],
          companies: []
        },
        filters: {
          locations: ['Remote', 'San Francisco', 'New York', 'London'],
          keywords: ['Software Engineer', 'Data Scientist', 'Product Manager', 'Designer'],
          experienceLevels: ['Entry Level', 'Mid Level', 'Senior Level'],
          jobTypes: ['Full-time', 'Part-time', 'Contract', 'Remote'],
          salaryRange: { min: 50000, max: 300000 }
        },
        createdBy: req.user?._id
      });

    if (!config._id) {
      await config.save();
    }

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('Error getting crawler configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update crawler configuration
export const updateCrawlerConfiguration = async (req, res) => {
  try {
    const updates = req.body;
    updates.lastModifiedBy = req.user?._id;

    const config = await CrawlerConfiguration.findOneAndUpdate(
      { name: 'default' },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    });

  } catch (error) {
    logger.error('Error updating crawler configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Initialize scheduled crawling
export const initializeScheduledCrawling = () => {
  try {
    crawlerService.setupScheduledCrawling();
    logger.info('Scheduled crawling initialized');
  } catch (error) {
    logger.error('Error initializing scheduled crawling:', error);
  }
};
