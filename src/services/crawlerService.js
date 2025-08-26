import * as cheerio from 'cheerio';
import axios from 'axios';
import cron from 'node-cron';
import os from 'os';
import Job from '../models/Job.js';
import CrawlerSession from '../models/CrawlerSession.js';
import logger from '../utils/logger.js';
import apiCrawlerService from './apiCrawlerService.js';
import playwrightCrawlerService from './playwrightCrawlerService.js';
import robotsChecker, { robotsAllowed, getCrawlDelay } from '../utils/robotsChecker.js';
import jobDataExtractor from './jobDataExtractor.js';

class CrawlerService {
  constructor() {
    this.browser = null;
    this.isRunning = false;
    this.shouldStop = false; // Add stop flag
    this.crawledJobs = new Set(); // Track crawled jobs to avoid duplicates
    this.activeSessions = new Map(); // Track active crawler sessions
    this.currentCrawlStats = {
      totalJobs: 0,
      currentSource: '',
      startTime: null,
      jobLimit: 20 // Default limit
    };
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];
  }

  // Legacy browser init (deprecated - use Playwright instead)
  async initBrowser() {
    logger.warn('Legacy browser initialization disabled - use Playwright service instead');
    return null;
  }

  // Close browser
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Get random user agent
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  // Delay function to avoid being blocked
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced crawl job with robots.txt compliance and structured data extraction using Playwright
   * @param {Object} options - Crawling options
   * @returns {Promise<Array>} - Array of structured job data
   */
  async crawlJobsEnhanced(options = {}) {
    const {
      urls = [],
      searchTerms = ['software engineer'],
      locations = ['remote'],
      sources = ['linkedin', 'indeed'],
      maxJobsPerSource = 25,
      respectRobots = true,
      crawlDelay = 1000
    } = options;

    const allJobs = [];
    let jobsProcessed = 0;

    try {
      logger.info('Starting enhanced job crawling with Playwright and robots.txt compliance');

      // If specific URLs provided, crawl them
      if (urls.length > 0) {
        for (const url of urls) {
          try {
            // Check robots.txt compliance
            if (respectRobots) {
              const isAllowed = await robotsAllowed(url, 'JobCrawler/1.0');
              if (!isAllowed) {
                logger.warn(`Crawling not allowed for ${url} according to robots.txt`);
                continue;
              }

              // Get and respect crawl delay
              const delay = await getCrawlDelay(url, 'JobCrawler/1.0');
              if (delay > 0) {
                logger.info(`Respecting crawl delay of ${delay}s for ${url}`);
                await this.delay(delay * 1000);
              }
            }

            // Use Playwright for better crawling
            const rawJobs = await playwrightCrawlerService.crawlUrl(url);
            
            // Extract structured data
            const structuredJobs = jobDataExtractor.batchExtract(rawJobs, 'crawled');
            
            allJobs.push(...structuredJobs);
            jobsProcessed += structuredJobs.length;
            
            logger.info(`Extracted ${structuredJobs.length} jobs from ${url}`);

            // Respect crawl delay between requests
            if (crawlDelay > 0) {
              await this.delay(crawlDelay);
            }

          } catch (error) {
            logger.error(`Error crawling ${url}:`, error);
          }
        }
      }

      // Crawl from known sources using Playwright
      for (const source of sources) {
        for (const searchTerm of searchTerms.slice(0, 2)) {
          for (const location of locations.slice(0, 2)) {
            try {
              let rawJobs = [];

              // Get appropriate crawl delay for the source
              const sourceDelay = respectRobots ? 
                await this.getSourceCrawlDelay(source) : crawlDelay;

              // Use Playwright service for all sources
              logger.info(`Using Playwright to crawl ${source} for "${searchTerm}" in ${location}`);
              
              switch (source.toLowerCase()) {
                case 'linkedin':
                  rawJobs = await playwrightCrawlerService.crawlLinkedIn(searchTerm, location, maxJobsPerSource);
                  break;
                case 'indeed':
                  rawJobs = await playwrightCrawlerService.crawlIndeed(searchTerm, location, maxJobsPerSource);
                  break;
                case 'remoteok':
                  rawJobs = await playwrightCrawlerService.crawlRemoteOK(searchTerm, maxJobsPerSource);
                  break;
                default:
                  logger.warn(`Unknown source: ${source}`);
                  continue;
              }

              // Extract structured data from raw jobs
              const structuredJobs = jobDataExtractor.batchExtract(rawJobs, source);
              
              allJobs.push(...structuredJobs);
              jobsProcessed += structuredJobs.length;
              
              logger.info(`Extracted ${structuredJobs.length} structured jobs from ${source} for "${searchTerm}" in ${location}`);

              // Respect source-specific crawl delay
              if (sourceDelay > 0) {
                await this.delay(sourceDelay);
              }

            } catch (error) {
              logger.error(`Error crawling ${source} for "${searchTerm}" in ${location}:`, error);
            }
          }
        }
      }

      logger.info(`Enhanced crawling completed with Playwright. Total jobs processed: ${jobsProcessed}`);
      return allJobs;

    } catch (error) {
      logger.error('Error in enhanced crawling:', error);
      throw error;
    }
  }

  /**
   * Get appropriate crawl delay for a source
   * @param {string} source - Job board source
   * @returns {Promise<number>} - Crawl delay in milliseconds
   */
  async getSourceCrawlDelay(source) {
    const sourceUrls = {
      linkedin: 'https://www.linkedin.com',
      indeed: 'https://www.indeed.com',
      remoteok: 'https://remoteok.io'
    };

    const url = sourceUrls[source.toLowerCase()];
    if (!url) return 1000; // Default 1 second

    try {
      const delay = await getCrawlDelay(url, 'JobCrawler/1.0');
      return Math.max(delay * 1000, 1000); // Minimum 1 second
    } catch (error) {
      logger.warn(`Error getting crawl delay for ${source}:`, error);
      return 2000; // Conservative 2 seconds
    }
  }

  /**
   * Crawl jobs from a single URL
   * @param {string} url - URL to crawl
   * @returns {Promise<Array>} - Raw job data
   */
  async crawlSingleUrl(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      // Generic job extraction (you can customize this based on the site structure)
      $('.job, .job-item, .posting, .vacancy, .position').each((index, element) => {
        try {
          const $job = $(element);
          
          const job = {
            title: $job.find('.title, .job-title, h2, h3').first().text().trim(),
            company: $job.find('.company, .employer, .organization').first().text().trim(),
            location: $job.find('.location, .city, .place').first().text().trim(),
            description: $job.find('.description, .summary, .content').first().text().trim(),
            salary: $job.find('.salary, .pay, .compensation').first().text().trim(),
            url: url,
            sourceUrl: $job.find('a').first().attr('href') || url,
            datePosted: $job.find('.date, .posted, time').first().text().trim()
          };

          if (job.title && job.company) {
            jobs.push(job);
          }
        } catch (error) {
          logger.warn('Error parsing job element:', error);
        }
      });

      return jobs;

    } catch (error) {
      logger.error(`Error crawling URL ${url}:`, error);
      return [];
    }
  }

  /**
   * Save extracted jobs to database
   * @param {Array} structuredJobs - Array of structured job data
   * @returns {Promise<Object>} - Save results
   */
  async saveExtractedJobs(structuredJobs) {
    const results = {
      saved: 0,
      duplicates: 0,
      errors: 0,
      savedJobs: []
    };

    for (const jobData of structuredJobs) {
      try {
        // Check for duplicates by title, company, and source
        const existingJob = await Job.findOne({
          title: jobData.title,
          company: jobData.company,
          source: jobData.source,
          sourceUrl: jobData.sourceUrl
        });

        if (existingJob) {
          results.duplicates++;
          logger.debug(`Duplicate job found: ${jobData.title} at ${jobData.company}`);
          continue;
        }

        // Create new job with enhanced data structure
        const newJob = new Job({
          ...jobData,
          // Map new fields to existing schema
          salaryLegacy: jobData.salary?.min && jobData.salary?.max ? 
            `${jobData.salary.min}-${jobData.salary.max} ${jobData.salary.currency}` : null,
          type: jobData.type || 'full-time'
        });

        const savedJob = await newJob.save();
        results.saved++;
        results.savedJobs.push(savedJob);

        logger.debug(`Saved job: ${jobData.title} at ${jobData.company}`);

      } catch (error) {
        results.errors++;
        logger.error(`Error saving job ${jobData.title}:`, error);
      }
    }

    logger.info(`Job save results: ${results.saved} saved, ${results.duplicates} duplicates, ${results.errors} errors`);
    return results;
  }

  // Indeed Job Scraper
  async scrapeIndeed(searchTerm = 'software engineer', location = 'remote', limit = 50) {
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for Indeed scraping, skipping...');
      return [];
    }
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent(this.getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(searchTerm)}&l=${encodeURIComponent(location)}&limit=${limit}`;
      logger.info(`Scraping Indeed: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.delay(2000);

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('[data-jk]');
        const jobsData = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('[data-testid="job-title"] a');
            const companyElement = element.querySelector('[data-testid="company-name"]');
            const locationElement = element.querySelector('[data-testid="job-location"]');
            const salaryElement = element.querySelector('[data-testid="attribute_snippet_testid"]');
            const summaryElement = element.querySelector('[data-testid="job-snippet"]');
            const linkElement = element.querySelector('[data-testid="job-title"] a');

            if (titleElement && companyElement) {
              jobsData.push({
                title: titleElement.textContent?.trim() || '',
                company: companyElement.textContent?.trim() || '',
                location: locationElement?.textContent?.trim() || 'Not specified',
                salary: salaryElement?.textContent?.trim() || 'Not specified',
                description: summaryElement?.textContent?.trim() || '',
                url: linkElement?.href || '',
                source: 'indeed',
                datePosted: new Date().toISOString(),
                type: 'full-time'
              });
            }
          } catch (error) {
            console.error('Error parsing job element:', error);
          }
        });

        return jobsData;
      });

      logger.info(`Found ${jobs.length} jobs on Indeed`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping Indeed:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  // LinkedIn Job Scraper (public jobs)
  async scrapeLinkedIn(searchTerm = 'software engineer', location = 'remote', limit = 25) {
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for LinkedIn scraping, skipping...');
      return [];
    }
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent(this.getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}`;
      logger.info(`Scraping LinkedIn: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.delay(3000);

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('.base-card');
        const jobsData = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('.base-search-card__title');
            const companyElement = element.querySelector('.base-search-card__subtitle');
            const locationElement = element.querySelector('.job-search-card__location');
            const linkElement = element.querySelector('.base-card__full-link');
            const timeElement = element.querySelector('time');

            if (titleElement && companyElement) {
              jobsData.push({
                title: titleElement.textContent?.trim() || '',
                company: companyElement.textContent?.trim() || '',
                location: locationElement?.textContent?.trim() || 'Not specified',
                salary: 'Not specified',
                description: '',
                url: linkElement?.href || '',
                source: 'linkedin',
                datePosted: timeElement?.getAttribute('datetime') || new Date().toISOString(),
                type: 'full-time'
              });
            }
          } catch (error) {
            console.error('Error parsing LinkedIn job element:', error);
          }
        });

        return jobsData;
      });

      logger.info(`Found ${jobs.length} jobs on LinkedIn`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping LinkedIn:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  // RemoteOK Job Scraper (Remote-specific jobs)
  async scrapeRemoteOK(searchTerm = 'software', limit = 50) {
    try {
      const url = `https://remoteok.io/api`;
      logger.info(`Scraping RemoteOK API: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      const jobs = response.data
        .slice(1, limit + 1) // First item is metadata
        .filter(job => job.position?.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(job => ({
          title: job.position || '',
          company: job.company || '',
          location: 'Remote',
          salary: job.salary_min && job.salary_max ? 
            `$${job.salary_min}k - $${job.salary_max}k` : 
            (job.salary_min ? `$${job.salary_min}k+` : 'Not specified'),
          description: job.description || '',
          url: job.url || `https://remoteok.io/remote-jobs/${job.id}`,
          source: 'remoteok',
          datePosted: this.parseDate(job.date),
          type: 'remote',
          tags: job.tags || [],
          skills: job.tags || [], // Use tags as skills for now
          experience: this.extractExperience(job.description || ''),
          department: this.extractDepartment(job.tags || [])
        }));

      logger.info(`Found ${jobs.length} jobs on RemoteOK`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping RemoteOK:', error);
      return [];
    }
  }

  // AngelList/Wellfound Job Scraper
  async scrapeAngelList(searchTerm = 'software engineer', limit = 25) {
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for Wellfound scraping, skipping...');
      return [];
    }
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent(this.getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const url = `https://wellfound.com/jobs?query=${encodeURIComponent(searchTerm)}`;
      logger.info(`Scraping Wellfound: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.delay(3000);

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('[data-test="JobCard"]');
        const jobsData = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('[data-test="JobTitle"]');
            const companyElement = element.querySelector('[data-test="CompanyName"]');
            const locationElement = element.querySelector('[data-test="JobLocation"]');
            const salaryElement = element.querySelector('[data-test="JobSalary"]');
            const linkElement = element.querySelector('a[href*="/jobs/"]');

            if (titleElement && companyElement) {
              jobsData.push({
                title: titleElement.textContent?.trim() || '',
                company: companyElement.textContent?.trim() || '',
                location: locationElement?.textContent?.trim() || 'Not specified',
                salary: salaryElement?.textContent?.trim() || 'Not specified',
                description: '',
                url: linkElement?.href ? `https://wellfound.com${linkElement.href}` : '',
                source: 'wellfound',
                datePosted: new Date().toISOString(),
                type: 'full-time'
              });
            }
          } catch (error) {
            console.error('Error parsing Wellfound job element:', error);
          }
        });

        return jobsData;
      });

      logger.info(`Found ${jobs.length} jobs on Wellfound`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping Wellfound:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  // Clean and process job data
  processJobData(jobs) {
    logger.info(`Processing ${jobs.length} jobs for data cleaning`);
    return jobs.map(job => {
      // Generate unique ID based on title, company, and source
      const uniqueId = `${job.title}-${job.company}-${job.source}`.toLowerCase().replace(/\s+/g, '-');
      
      // Skip if already processed
      if (this.crawledJobs.has(uniqueId)) {
        logger.debug(`Skipping already processed job: ${uniqueId}`);
        return null;
      }
      
      this.crawledJobs.add(uniqueId);

      return {
        title: job.title.substring(0, 200), // Limit title length
        company: job.company.substring(0, 100),
        location: job.location || 'Not specified',
        type: this.normalizeJobType(job.type),
        salary: this.normalizeSalary(job.salary),
        description: job.description?.substring(0, 5000) || 'No description available',
        source: job.source,
        sourceUrl: job.url,
        externalUrl: job.url, // Add externalUrl for applications
        datePosted: this.parseDate(job.datePosted),
        tags: job.tags || [],
        skills: job.skills || [], // Add skills field
        isActive: true,
        status: 'open', // Explicitly set status
        crawledAt: new Date()
      };
    }).filter(job => job !== null);
  }

  // Normalize job type
  normalizeJobType(type) {
    if (!type) return 'full-time';
    
    const typeMap = {
      'remote': 'remote',
      'fulltime': 'full-time',
      'full-time': 'full-time',
      'parttime': 'part-time', 
      'part-time': 'part-time',
      'contract': 'contract',
      'freelance': 'contract',
      'internship': 'internship'
    };

    const normalized = type.toLowerCase().replace(/[-_\s]/g, '');
    return typeMap[normalized] || 'full-time';
  }

  // Normalize salary information
  normalizeSalary(salary) {
    if (!salary || salary === 'Not specified') return null;
    
    // Extract numbers from salary string
    const numbers = salary.match(/[\d,]+/g);
    if (numbers && numbers.length > 0) {
      return salary.substring(0, 100); // Keep original format but limit length
    }
    
    return salary;
  }

  // Extract experience level from description
  extractExperience(description) {
    const expPatterns = [
      /(\d+)[\s-]*(\d+)?\s*years?\s*(of\s*)?experience/i,
      /(entry|junior|senior|mid|lead|principal)\s*(level)?/i,
      /(junior|senior|mid-level|entry-level)/i
    ];

    for (const pattern of expPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }

  // Extract department from tags
  extractDepartment(tags) {
    const departmentMap = {
      'frontend': 'Engineering',
      'backend': 'Engineering', 
      'fullstack': 'Engineering',
      'dev': 'Engineering',
      'engineering': 'Engineering',
      'design': 'Design',
      'ui': 'Design',
      'ux': 'Design',
      'marketing': 'Marketing',
      'sales': 'Sales',
      'product': 'Product',
      'data': 'Data Science',
      'analytics': 'Data Science'
    };

    for (const tag of tags) {
      const normalized = tag.toLowerCase();
      if (departmentMap[normalized]) {
        return departmentMap[normalized];
      }
    }

    return null;
  }

  // Parse date safely
  parseDate(dateValue) {
    if (!dateValue) return new Date().toISOString();
    
    try {
      // RemoteOK sometimes sends unix timestamp
      if (typeof dateValue === 'number') {
        // If it's a unix timestamp (seconds), convert to milliseconds
        const timestamp = dateValue < 1e10 ? dateValue * 1000 : dateValue;
        return new Date(timestamp).toISOString();
      }
      
      // If it's a string, try to parse it
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toISOString();
      }
      
      // Default to current date
      return new Date().toISOString();
    } catch (error) {
      logger.warn(`Failed to parse date "${dateValue}": ${error.message}`);
      return new Date().toISOString();
    }
  }

  // Optimized bulk save jobs to database
  async saveJobsToDatabase(jobs) {
    if (!jobs || jobs.length === 0) {
      logger.warn('No jobs to save');
      return { savedCount: 0, errorCount: 0 };
    }

    logger.info(`💾 Starting database save for ${jobs.length} jobs`);
    
    const processedJobs = this.processJobData(jobs);
    let savedCount = 0;
    let errorCount = 0;
    let updatedCount = 0;

    logger.info(`After processing: ${processedJobs.length} jobs for database save`);

    // Process jobs in small batches to avoid timeouts
    const batchSize = 5;
    for (let i = 0; i < processedJobs.length; i += batchSize) {
      const batch = processedJobs.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(processedJobs.length / batchSize);
      
      logger.info(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} jobs)`);

      try {
        // Build upsert operations for this batch
        const bulkOps = [];
        
        for (const jobData of batch) {
          // Validate required fields
          if (!jobData.title || !jobData.company || jobData.company.trim() === '') {
            logger.warn(`Skipping invalid job: ${jobData.title || 'No title'} at ${jobData.company || 'No company'}`);
            errorCount++;
            continue;
          }

          // Create unique filter - prefer sourceUrl, fallback to title+company+source
          const filter = jobData.sourceUrl && jobData.sourceUrl !== '' 
            ? { sourceUrl: jobData.sourceUrl }
            : {
                title: jobData.title,
                company: jobData.company,
                source: jobData.source || 'unknown'
              };

          bulkOps.push({
            updateOne: {
              filter: filter,
              update: {
                $set: {
                  ...jobData,
                  crawledAt: new Date(),
                  isActive: true,
                  updatedAt: new Date()
                }
              },
              upsert: true
            }
          });
        }

        if (bulkOps.length > 0) {
          // Execute bulk operation with timeout
          const bulkResult = await Job.bulkWrite(bulkOps, {
            ordered: false, // Continue processing even if some fail
            timeout: 10000  // 10 second timeout
          });
          
          const batchNew = bulkResult.upsertedCount || 0;
          const batchUpdated = bulkResult.modifiedCount || 0;
          
          savedCount += batchNew;
          updatedCount += batchUpdated;
          
          logger.info(`✅ Batch ${batchNum}: ${batchNew} new, ${batchUpdated} updated`);
        }

        // Short delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (batchError) {
        logger.error(`❌ Batch ${batchNum} failed: ${batchError.message}`);
        
        // Fallback: Try individual saves for failed batch
        for (const jobData of batch) {
          try {
            if (!jobData.title || !jobData.company || jobData.company.trim() === '') {
              errorCount++;
              continue;
            }

            // Simple upsert with timeout
            const result = await Job.findOneAndUpdate(
              jobData.sourceUrl 
                ? { sourceUrl: jobData.sourceUrl }
                : { title: jobData.title, company: jobData.company, source: jobData.source },
              {
                $set: {
                  ...jobData,
                  crawledAt: new Date(),
                  isActive: true,
                  updatedAt: new Date()
                }
              },
              { 
                upsert: true, 
                new: true,
                timeout: 3000, // 3 second timeout
                runValidators: false
              }
            );
            
            // Check if it was a new document or update
            if (result) {
              // If the document was created (upserted), it won't have a previous version
              savedCount++;
              logger.debug(`✅ Saved: "${jobData.title}" at "${jobData.company}"`);
            }
            
          } catch (individualError) {
            logger.error(`❌ Failed to save "${jobData.title}": ${individualError.message}`);
            errorCount++;
          }
        }
      }
    }

    logger.info(`🎯 Database save completed: ${savedCount} new jobs, ${updatedCount} updated, ${errorCount} errors`);
    return { savedCount, errorCount, updatedCount };
  }

  // Stop crawling function
  stopCrawling() {
    logger.info('🛑 Stop crawling requested');
    this.shouldStop = true;
    return {
      success: true,
      message: 'Crawling will stop after current batch',
      stats: this.currentCrawlStats
    };
  }

  // Reset stop flag
  resetStopFlag() {
    this.shouldStop = false;
  }

  // Check if we should stop crawling
  shouldStopCrawling() {
    return this.shouldStop;
  }

  // Main crawl function with limits and stop capability
  async crawlJobs(options = {}) {
    if (this.isRunning) {
      logger.warn('Crawl already in progress, skipping...');
      return { success: false, message: 'Crawl already in progress' };
    }

    this.isRunning = true;
    this.shouldStop = false; // Reset stop flag
    this.currentCrawlStats = {
      totalJobs: 0,
      currentSource: '',
      startTime: new Date(),
      jobLimit: options.maxJobs || 20 // Default to 20 jobs
    };
    
    logger.info(`🚀 Starting limited job crawling (max: ${this.currentCrawlStats.jobLimit} jobs)...`);

    const {
      searchTerms = ['software engineer'],
      locations = ['remote'],
      sources = ['linkedin', 'indeed', 'wellfound', 'remoteok'],
      maxJobs = 20 // Default to 20 jobs to avoid timeouts
    } = options;

    // Limit sources and search terms to prevent timeouts
    const limitedSources = sources.slice(0, 2); // Max 2 sources at a time
    const limitedSearchTerms = searchTerms.slice(0, 1); // Max 1 search term
    const limitedLocations = locations.slice(0, 1); // Max 1 location

    const allJobs = [];
    const results = {
      success: true,
      totalJobs: 0,
      savedJobs: 0,
      errors: 0,
      sources: {},
      mode: 'hybrid' // browser + api
    };

    try {
      logger.info(`🎯 Target: ${maxJobs} jobs from sources: ${limitedSources.join(', ')}`);

      // Use Playwright for browser-based scraping with limits
      const browserSources = limitedSources.filter(s => ['indeed', 'linkedin', 'wellfound', 'glassdoor'].includes(s));
      if (browserSources.length > 0 && !this.shouldStopCrawling() && allJobs.length < maxJobs) {
        this.currentCrawlStats.currentSource = `Browser sources: ${browserSources.join(', ')}`;
        logger.info(`🎭 Starting limited browser crawling (max ${Math.min(15, maxJobs)} jobs)...`);
        
        const playwrightResult = await playwrightCrawlerService.crawlBrowserJobs({
          searchTerms: limitedSearchTerms,
          locations: limitedLocations,
          sources: browserSources
        });
        
        if (playwrightResult.results.success) {
          // Limit jobs to maxJobs
          const limitedJobs = playwrightResult.jobs.slice(0, maxJobs - allJobs.length);
          allJobs.push(...limitedJobs);
          Object.assign(results.sources, playwrightResult.results.sources);
          results.mode = 'playwright-browser';
          logger.info(`✅ Browser crawling: ${limitedJobs.length} jobs added (${allJobs.length}/${maxJobs})`);
          
          // Update stats
          this.currentCrawlStats.totalJobs = allJobs.length;
          
          // Stop if we reached the limit
          if (allJobs.length >= maxJobs) {
            logger.info(`🎯 Job limit reached (${maxJobs}), stopping browser crawling`);
          }
        } else {
          logger.warn('⚠️ Browser crawling failed, trying API sources');
          results.mode = 'api-fallback';
        }
      }

      // Use API crawler for remaining jobs if under limit
      const apiSources = limitedSources.filter(s => ['remoteok', 'github', 'hackernews', 'stackoverflow', 'adobe'].includes(s));
      if (apiSources.length > 0 && !this.shouldStopCrawling() && allJobs.length < maxJobs) {
        this.currentCrawlStats.currentSource = `API sources: ${apiSources.join(', ')}`;
        const remainingJobs = maxJobs - allJobs.length;
        logger.info(`🔌 Starting API crawling for remaining ${remainingJobs} jobs...`);
        
        const apiResult = await apiCrawlerService.crawlAPIJobs({
          searchTerms: limitedSearchTerms,
          sources: apiSources
        });
        
        // Limit jobs to remaining quota
        const limitedApiJobs = apiResult.jobs.slice(0, remainingJobs);
        allJobs.push(...limitedApiJobs);
        Object.assign(results.sources, apiResult.results.sources);
        logger.info(`✅ API crawling: ${limitedApiJobs.length} jobs added (${allJobs.length}/${maxJobs})`);
        
        // Update stats
        this.currentCrawlStats.totalJobs = allJobs.length;
      }

      // If no browser sources worked, fallback to legacy scraping
      if (allJobs.length === 0 && browserSources.length > 0) {
        logger.warn('🔄 Attempting legacy browser fallback...');
        const browser = await this.initBrowser();
        
        if (browser) {
          logger.info('Legacy browser available, using Puppeteer fallback');
          results.mode = 'puppeteer-fallback';

          for (const searchTerm of searchTerms.slice(0, 2)) {
            for (const location of locations.slice(0, 2)) {
              try {
                if (sources.includes('indeed')) {
                  const indeedJobs = await this.scrapeIndeed(searchTerm, location, 20);
                  allJobs.push(...indeedJobs);
                  results.sources.indeed = (results.sources.indeed || 0) + indeedJobs.length;
                  await this.delay(2000);
                }

                if (sources.includes('linkedin')) {
                  const linkedinJobs = await this.scrapeLinkedIn(searchTerm, location, 15);
                  allJobs.push(...linkedinJobs);
                  results.sources.linkedin = (results.sources.linkedin || 0) + linkedinJobs.length;
                  await this.delay(3000);
                }

                if (sources.includes('wellfound')) {
                  const wellfoundJobs = await this.scrapeAngelList(searchTerm, 15);
                  allJobs.push(...wellfoundJobs);
                  results.sources.wellfound = (results.sources.wellfound || 0) + wellfoundJobs.length;
                  await this.delay(2000);
                }

              } catch (error) {
                logger.error(`Error in legacy crawling ${searchTerm} in ${location}:`, error);
                results.errors++;
              }
            }
          }
        } else {
          logger.warn('No browser available, using API-only mode');
          results.mode = 'api-only';
        }
      }

      // Always add additional API-only sources for maximum coverage
      const additionalApiSources = sources.filter(s => ['stackoverflow'].includes(s));
      if (additionalApiSources.length > 0) {
        logger.info('Adding additional API-only sources for maximum coverage');
        const additionalApiResult = await apiCrawlerService.crawlAPIJobs({
          searchTerms: searchTerms.slice(0, 1), // Limit to avoid rate limits
          sources: additionalApiSources
        });
        
        allJobs.push(...additionalApiResult.jobs);
        Object.assign(results.sources, additionalApiResult.results.sources);
      }

      // Check if stopped manually
      if (this.shouldStopCrawling()) {
        logger.info('🛑 Crawling stopped manually');
        results.stopped = true;
        results.message = 'Crawling stopped by user request';
      }

      // Save all jobs to database
      results.totalJobs = allJobs.length;
      this.currentCrawlStats.totalJobs = allJobs.length;
      
      if (allJobs.length > 0) {
        logger.info(`💾 Saving ${allJobs.length} jobs to database...`);
        const saveResult = await this.saveJobsToDatabase(allJobs);
        results.savedJobs = saveResult.savedCount;
        results.updatedJobs = saveResult.updatedCount;
        results.errors += saveResult.errorCount;
        
        const duration = Math.round((new Date() - this.currentCrawlStats.startTime) / 1000);
        logger.info(`🎉 Crawling completed (${results.mode}): ${results.totalJobs} jobs found, ${results.savedJobs} saved in ${duration}s`);
      } else {
        logger.warn('⚠️ No jobs found during crawling');
      }

      // Add final stats
      results.duration = Math.round((new Date() - this.currentCrawlStats.startTime) / 1000);
      results.jobsPerSecond = results.totalJobs / results.duration || 0;

    } catch (error) {
      logger.error('❌ Critical error during crawling:', error);
      results.success = false;
      results.error = error.message;
    } finally {
      this.isRunning = false;
      this.shouldStop = false;
      await this.closeBrowser();
      
      // Reset stats
      this.currentCrawlStats = {
        totalJobs: 0,
        currentSource: '',
        startTime: null,
        jobLimit: 20
      };
    }

    return results;
  }

  // Setup automated crawling schedule
  setupScheduledCrawling() {
    // Run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      logger.info('Starting scheduled job crawling...');
      await this.crawlJobs();
    });

    // Run daily cleanup (remove old jobs)
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily cleanup...');
      await this.cleanupOldJobs();
    });

    logger.info('Scheduled crawling setup complete');
  }

  // Cleanup old jobs (older than 30 days)
  async cleanupOldJobs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Job.deleteMany({
        crawledAt: { $lt: thirtyDaysAgo }
      });

      logger.info(`Cleaned up ${result.deletedCount} old jobs`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error during cleanup:', error);
      return 0;
    }
  }

  // Session-based crawling with real-time updates
  async crawlJobsWithSession(options = {}) {
    const {
      sessionId,
      searchTerms = ['software engineer'],
      locations = ['remote'],
      sources = ['linkedin', 'indeed', 'wellfound', 'remoteok'],
      companies = [],
      maxJobs = 20,
      crawlerInstance = 1
    } = options;

    let session;
    try {
      // Get session from database
      session = await CrawlerSession.findOne({ sessionId });
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Mark session as active
      this.activeSessions.set(sessionId, {
        startTime: new Date(),
        crawlerInstance,
        status: 'running'
      });

      await session.updateProgress({
        currentStep: 'Starting crawl',
        stepsCompleted: 0,
        totalSteps: sources.length * searchTerms.length
      });

      await session.addNotification('info', `Crawler C${crawlerInstance} initializing...`);

      const allJobs = [];
      const results = {
        success: true,
        totalJobs: 0,
        savedJobs: 0,
        errors: 0,
        sources: {},
        mode: 'session-based',
        sessionId,
        crawlerInstance
      };

      let stepCounter = 0;
      const totalSteps = sources.length * searchTerms.length;

      // Process companies if provided
      if (companies.length > 0) {
        await session.updateProgress({
          currentStep: 'Processing company jobs',
          currentCompany: companies[0]?.name || 'Various'
        });

        for (const company of companies.slice(0, 5)) { // Limit companies
          if (this.shouldStopCrawling()) break;

          try {
            await session.addNotification('info', `Fetching jobs from ${company.name}`);
            
            // Mock company job fetching (replace with actual implementation)
            const companyJobs = await this.fetchCompanyJobs(company, searchTerms[0]);
            
            // Add to session results
            for (const job of companyJobs) {
              await session.addResult({
                title: job.title,
                company: job.company,
                location: job.location,
                source: 'company_direct'
              });
            }

            allJobs.push(...companyJobs);
            session.statistics.companiesFetched += 1;
            
            // Update session statistics
            session.statistics.totalJobsFound = allJobs.length;
            await session.save();

          } catch (error) {
            logger.error(`Error fetching jobs from ${company.name}:`, error);
            session.errors.push({
              source: company.name,
              error: error.message
            });
            await session.save();
          }
        }
      }

      // Process job sources
      for (const source of sources) {
        if (this.shouldStopCrawling()) break;

        for (const searchTerm of searchTerms) {
          if (this.shouldStopCrawling()) break;

          stepCounter++;
          await session.updateProgress({
            currentStep: `Crawling ${source} for "${searchTerm}"`,
            stepsCompleted: stepCounter,
            totalSteps,
            currentSource: source
          });

          await session.addNotification('info', `Crawler C${crawlerInstance} processing ${source} - "${searchTerm}"`);

          try {
            let jobs = [];
            
            // Use appropriate crawling method based on source
            switch (source.toLowerCase()) {
              case 'remoteok':
                jobs = await this.scrapeRemoteOK(searchTerm, Math.min(maxJobs / sources.length, 20));
                break;
              case 'indeed':
                jobs = await this.scrapeIndeed(searchTerm, locations[0], Math.min(maxJobs / sources.length, 15));
                break;
              case 'linkedin':
                jobs = await this.scrapeLinkedIn(searchTerm, locations[0], Math.min(maxJobs / sources.length, 15));
                break;
              case 'wellfound':
                jobs = await this.scrapeAngelList(searchTerm, Math.min(maxJobs / sources.length, 15));
                break;
              default:
                logger.warn(`Unknown source: ${source}`);
                continue;
            }

            // Add to session results
            for (const job of jobs) {
              await session.addResult({
                title: job.title,
                company: job.company,
                location: job.location,
                source: job.source
              });
            }

            allJobs.push(...jobs);
            results.sources[source] = jobs.length;
            
            // Update session statistics
            session.statistics.totalJobsFound = allJobs.length;
            session.statistics.titlesFetched += jobs.length;
            await session.save();

            await session.addNotification('success', `Found ${jobs.length} jobs from ${source}`);

            // Add delay between sources
            await this.delay(2000);

          } catch (error) {
            logger.error(`Error crawling ${source} for "${searchTerm}":`, error);
            session.errors.push({
              source,
              error: error.message
            });
            await session.save();
            results.errors++;

            await session.addNotification('error', `Failed to crawl ${source}: ${error.message}`);
          }
        }
      }

      // Save jobs to database
      results.totalJobs = allJobs.length;
      
      if (allJobs.length > 0) {
        await session.updateProgress({
          currentStep: 'Saving jobs to database',
          stepsCompleted: totalSteps
        });

        await session.addNotification('info', `Saving ${allJobs.length} jobs to database...`);

        const saveResult = await this.saveJobsToDatabase(allJobs);
        results.savedJobs = saveResult.savedCount;
        results.errors += saveResult.errorCount;

        // Update session final statistics
        session.statistics.jobsSaved = saveResult.savedCount;
        session.statistics.totalJobsFound = allJobs.length;
        
        await session.addNotification('success', 
          `Crawler C${crawlerInstance} completed: ${allJobs.length} jobs found, ${saveResult.savedCount} saved`
        );
      }

      // Complete session
      await session.complete('completed');
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      logger.info(`Session ${sessionId} completed: ${results.totalJobs} jobs found, ${results.savedJobs} saved`);
      return results;

    } catch (error) {
      logger.error(`Session ${sessionId} failed:`, error);
      
      if (session) {
        session.errors.push({
          source: 'system',
          error: error.message
        });
        await session.addNotification('error', `Crawler C${crawlerInstance} failed: ${error.message}`);
        await session.complete('failed');
      }
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      
      throw error;
    }
  }

  // Mock company job fetching (replace with actual implementation)
  async fetchCompanyJobs(company, searchTerm) {
    // This would implement actual company-specific job fetching
    // For now, return mock data
    return [
      {
        title: `${searchTerm} at ${company.name}`,
        company: company.name,
        location: 'Remote',
        salary: 'Competitive',
        description: `${searchTerm} position at ${company.name}`,
        source: 'company_direct',
        datePosted: new Date().toISOString(),
        type: 'full-time'
      }
    ];
  }

  // Get active sessions status
  getActiveSessions() {
    return Array.from(this.activeSessions.entries()).map(([sessionId, data]) => ({
      sessionId,
      ...data,
      duration: Math.round((new Date() - data.startTime) / 1000)
    }));
  }

  // Get crawling status with session info
  getStatus() {
    return {
      isRunning: this.isRunning,
      browserActive: !!this.browser,
      crawledJobsCount: this.crawledJobs.size,
      activeSessions: this.getActiveSessions(),
      activeSessionCount: this.activeSessions.size
    };
  }
}

export default new CrawlerService(); 