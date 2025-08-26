import CrawlerInstance from '../models/CrawlerInstance.js';
import logger from '../utils/logger.js';

// Get all active crawler instances
export const getCrawlerInstances = async (req, res) => {
  try {
    const crawlers = await CrawlerInstance.find({ isActive: true })
      .sort({ crawlerId: 1 })
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: crawlers
    });

  } catch (error) {
    logger.error('Error fetching crawler instances:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create a new crawler instance
export const createCrawlerInstance = async (req, res) => {
  try {
    const {
      sources = ['linkedin', 'indeed'],
      searchTerms = ['software engineer'],
      locations = ['remote'],
      maxJobsPerSource = 25,
      respectRobots = true,
      companies = []
    } = req.body;

    // Find the next available crawler ID using a more robust approach
    const existingCrawlers = await CrawlerInstance.find({}).sort({ crawlerId: 1 });
    const existingIds = existingCrawlers.map(c => c.crawlerId).filter(id => id != null);
    
    console.log('📊 Existing crawler IDs:', existingIds);
    
    // Find the first gap in the sequence or use the next number after the highest
    let nextCrawlerId = 1;
    if (existingIds.length === 0) {
      nextCrawlerId = 1;
    } else {
      // Sort IDs and find first gap
      const sortedIds = existingIds.sort((a, b) => a - b);
      for (let i = 0; i < sortedIds.length; i++) {
        if (sortedIds[i] !== i + 1) {
          nextCrawlerId = i + 1;
          break;
        }
      }
      // If no gap found, use next number after highest
      if (nextCrawlerId === 1 && sortedIds.length > 0) {
        nextCrawlerId = Math.max(...sortedIds) + 1;
      }
    }
    
    console.log('🆕 Next available crawler ID:', nextCrawlerId);
    
    // Double-check that this ID doesn't exist (safety check)
    const existingCrawler = await CrawlerInstance.findOne({ crawlerId: nextCrawlerId });
    if (existingCrawler) {
      console.error('❌ ID conflict detected, using timestamp-based ID');
      nextCrawlerId = Date.now() % 10000; // Use timestamp-based ID as fallback
    }

    const crawlerInstance = new CrawlerInstance({
      crawlerId: nextCrawlerId,
      name: `Crawler ${nextCrawlerId}`,
      configuration: {
        sources,
        searchTerms,
        locations,
        maxJobsPerSource,
        respectRobots
      },
      companies,
      createdBy: req.user?._id
    });

    const savedCrawler = await crawlerInstance.save();

    logger.info(`New crawler instance C${nextCrawlerId} created by ${req.user?.email || 'System'}`);

    res.json({
      success: true,
      message: `Crawler ${nextCrawlerId} created successfully`,
      data: savedCrawler
    });

  } catch (error) {
    logger.error('Error creating crawler instance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.toString()
    });
  }
};

// Update crawler instance configuration
export const updateCrawlerInstance = async (req, res) => {
  try {
    const { crawlerId } = req.params;
    const updateData = req.body;

    const crawler = await CrawlerInstance.findOne({ 
      crawlerId: parseInt(crawlerId), 
      isActive: true 
    });

    if (!crawler) {
      return res.status(404).json({
        success: false,
        error: 'Crawler instance not found'
      });
    }

    // Update configuration
    if (updateData.configuration) {
      crawler.configuration = { ...crawler.configuration, ...updateData.configuration };
    }

    // Update companies
    if (updateData.companies) {
      crawler.companies = updateData.companies;
    }

    // Update status
    if (updateData.status) {
      crawler.status = updateData.status;
    }

    const updatedCrawler = await crawler.save();

    logger.info(`Crawler C${crawlerId} updated by ${req.user?.email || 'System'}`);

    res.json({
      success: true,
      message: `Crawler ${crawlerId} updated successfully`,
      data: updatedCrawler
    });

  } catch (error) {
    logger.error('Error updating crawler instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete (deactivate) crawler instance
export const deleteCrawlerInstance = async (req, res) => {
  try {
    const { crawlerId } = req.params;

    const crawler = await CrawlerInstance.findOne({ 
      crawlerId: parseInt(crawlerId), 
      isActive: true 
    });

    if (!crawler) {
      return res.status(404).json({
        success: false,
        error: 'Crawler instance not found'
      });
    }

    // Soft delete by setting isActive to false
    crawler.isActive = false;
    crawler.status = 'disabled';
    await crawler.save();

    logger.info(`Crawler C${crawlerId} deleted by ${req.user?.email || 'System'}`);

    res.json({
      success: true,
      message: `Crawler ${crawlerId} deleted successfully`
    });

  } catch (error) {
    logger.error('Error deleting crawler instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Start a specific crawler instance
export const startCrawlerInstance = async (req, res) => {
  try {
    const { crawlerId } = req.params;

    const crawler = await CrawlerInstance.findOne({ 
      crawlerId: parseInt(crawlerId), 
      isActive: true 
    });

    if (!crawler) {
      return res.status(404).json({
        success: false,
        error: 'Crawler instance not found'
      });
    }

    if (crawler.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Crawler is already running'
      });
    }

    await crawler.start();

    // TODO: Start actual crawling process here
    // For now, we'll just update the status

    logger.info(`Crawler C${crawlerId} started by ${req.user?.email || 'System'}`);

    res.json({
      success: true,
      message: `Crawler ${crawlerId} started successfully`,
      data: crawler
    });

  } catch (error) {
    logger.error('Error starting crawler instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Stop a specific crawler instance
export const stopCrawlerInstance = async (req, res) => {
  try {
    const { crawlerId } = req.params;

    const crawler = await CrawlerInstance.findOne({ 
      crawlerId: parseInt(crawlerId), 
      isActive: true 
    });

    if (!crawler) {
      return res.status(404).json({
        success: false,
        error: 'Crawler instance not found'
      });
    }

    await crawler.stop();

    logger.info(`Crawler C${crawlerId} stopped by ${req.user?.email || 'System'}`);

    res.json({
      success: true,
      message: `Crawler ${crawlerId} stopped successfully`,
      data: crawler
    });

  } catch (error) {
    logger.error('Error stopping crawler instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Initialize default crawler instances
export const initializeDefaultCrawlers = async () => {
  try {
    const existingCrawlers = await CrawlerInstance.countDocuments({ isActive: true });
    
    if (existingCrawlers === 0) {
      // Create 4 default crawler instances
      const defaultCrawlers = [
        {
          crawlerId: 1,
          name: 'Crawler 1',
          configuration: {
            sources: ['linkedin'],
            searchTerms: ['software engineer'],
            locations: ['remote'],
            maxJobsPerSource: 25,
            respectRobots: true
          },
          companies: [
            { name: 'Google', url: 'https://careers.google.com', robotsAllowed: true, jobs: 245, level: 'Senior', type: 'FTE', location: 'Mountain View, CA' },
            { name: 'Microsoft', url: 'https://careers.microsoft.com', robotsAllowed: true, jobs: 189, level: 'Mid-Senior', type: 'FTE, Contract', location: 'Redmond, WA' },
            { name: 'Amazon', url: 'https://amazon.jobs', robotsAllowed: true, jobs: 356, level: 'All Levels', type: 'FTE, Internship', location: 'Seattle, WA' }
          ]
        },
        {
          crawlerId: 2,
          name: 'Crawler 2',
          configuration: {
            sources: ['indeed'],
            searchTerms: ['developer', 'programmer'],
            locations: ['san francisco'],
            maxJobsPerSource: 25,
            respectRobots: true
          },
          companies: [
            { name: 'Meta', url: 'https://metacareers.com', robotsAllowed: false, jobs: 0, level: 'N/A', type: 'N/A', location: 'Menlo Park, CA' },
            { name: 'Apple', url: 'https://jobs.apple.com', robotsAllowed: true, jobs: 167, level: 'Senior', type: 'FTE', location: 'Cupertino, CA' },
            { name: 'Netflix', url: 'https://jobs.netflix.com', robotsAllowed: true, jobs: 89, level: 'Senior', type: 'FTE, Contract', location: 'Los Gatos, CA' }
          ]
        },
        {
          crawlerId: 3,
          name: 'Crawler 3',
          configuration: {
            sources: ['remoteok'],
            searchTerms: ['full stack', 'backend'],
            locations: ['remote'],
            maxJobsPerSource: 25,
            respectRobots: true
          },
          companies: [
            { name: 'Tesla', url: 'https://tesla.com/careers', robotsAllowed: true, jobs: 234, level: 'Mid-Senior', type: 'FTE', location: 'Austin, TX' },
            { name: 'Uber', url: 'https://uber.com/careers', robotsAllowed: true, jobs: 145, level: 'All Levels', type: 'FTE, Contract', location: 'San Francisco, CA' },
            { name: 'Airbnb', url: 'https://careers.airbnb.com', robotsAllowed: true, jobs: 78, level: 'Mid-Senior', type: 'FTE', location: 'San Francisco, CA' }
          ]
        },
        {
          crawlerId: 4,
          name: 'Crawler 4',
          configuration: {
            sources: ['linkedin', 'indeed'],
            searchTerms: ['frontend', 'react'],
            locations: ['new york'],
            maxJobsPerSource: 25,
            respectRobots: true
          },
          companies: [
            { name: 'Spotify', url: 'https://spotify.com/careers', robotsAllowed: true, jobs: 123, level: 'All Levels', type: 'FTE, Internship', location: 'Stockholm, Sweden' }
          ]
        }
      ];

      for (const crawlerData of defaultCrawlers) {
        const crawler = new CrawlerInstance(crawlerData);
        await crawler.save();
      }

      logger.info('Default crawler instances initialized');
    }
  } catch (error) {
    logger.error('Error initializing default crawlers:', error);
  }
};

// Remove crawler instance
export const removeCrawlerInstance = async (req, res) => {
  try {
    const { crawlerId } = req.params;

    // Find the crawler instance
    const crawler = await CrawlerInstance.findOne({ crawlerId: parseInt(crawlerId) });

    if (!crawler) {
      return res.status(404).json({
        success: false,
        error: `Crawler ${crawlerId} not found`
      });
    }

    // Check if crawler is running
    if (crawler.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a running crawler. Please stop it first.'
      });
    }

    // Delete the crawler
    await CrawlerInstance.deleteOne({ crawlerId: parseInt(crawlerId) });

    logger.info(`Crawler C${crawlerId} deleted by ${req.user?.email || 'System'}`);

    res.json({
      success: true,
      message: `Crawler ${crawlerId} deleted successfully`
    });

  } catch (error) {
    logger.error('Error deleting crawler instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
