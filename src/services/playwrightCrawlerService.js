import { chromium } from 'playwright';
import logger from '../utils/logger.js';

class PlaywrightCrawlerService {
  constructor() {
    this.browser = null;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  async initBrowser() {
    if (!this.browser) {
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor'
          ]
        });
        logger.info('✅ Playwright browser launched successfully');
        return this.browser;
      } catch (error) {
        logger.error('❌ Failed to launch Playwright browser:', error);
        return null;
      }
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced Indeed Scraper with Playwright
  async scrapeIndeed(searchTerm = 'software engineer', location = 'remote', limit = 50) {
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for Indeed scraping');
      return [];
    }

    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    try {
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(searchTerm)}&l=${encodeURIComponent(location)}&limit=${limit}&sort=date`;
      logger.info(`🔍 Scraping Indeed: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.delay(2000);

      // Wait for job cards to load
      await page.waitForSelector('[data-jk]', { timeout: 10000 }).catch(() => {
        logger.warn('Job cards selector not found, trying alternative');
      });

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('[data-jk], .job_seen_beacon, .slider_container .slider_item');
        const jobsData = [];

        jobElements.forEach(element => {
          try {
            // Multiple selector strategies for Indeed's dynamic structure
            const titleElement = element.querySelector('[data-testid="job-title"] a, .jobTitle a, h2 a, .jobTitle-color-purple');
            const companyElement = element.querySelector('[data-testid="company-name"], .companyName, [data-testid="company-name"] a');
            const locationElement = element.querySelector('[data-testid="job-location"], .companyLocation, .locationsContainer');
            const salaryElement = element.querySelector('[data-testid="attribute_snippet_testid"], .salary-snippet, .estimatedSalary');
            const summaryElement = element.querySelector('[data-testid="job-snippet"], .summary, .job-snippet');
            const linkElement = titleElement;

            if (titleElement && companyElement) {
              const title = titleElement.textContent?.trim() || '';
              const company = companyElement.textContent?.trim() || '';
              
              if (title && company && title.length > 0 && company.length > 0) {
                jobsData.push({
                  title: title,
                  company: company,
                  location: locationElement?.textContent?.trim() || 'Not specified',
                  salary: salaryElement?.textContent?.trim() || 'Not specified',
                  description: summaryElement?.textContent?.trim() || '',
                  url: linkElement?.href || '',
                  source: 'indeed',
                  datePosted: new Date().toISOString(),
                  type: 'full-time',
                  featured: element.classList.contains('sponsored') || false
                });
              }
            }
          } catch (error) {
            console.error('Error parsing Indeed job element:', error);
          }
        });

        return jobsData;
      });

      logger.info(`✅ Found ${jobs.length} jobs on Indeed`);
      return jobs;

    } catch (error) {
      logger.error('❌ Error scraping Indeed:', error);
      return [];
    } finally {
      await context.close();
    }
  }

  // Enhanced LinkedIn Scraper with Playwright
  async scrapeLinkedIn(searchTerm = 'software engineer', location = 'remote', limit = 25) {
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for LinkedIn scraping');
      return [];
    }

    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    try {
      const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}&f_TPR=r86400&sortBy=DD`;
      logger.info(`🔍 Scraping LinkedIn: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.delay(3000);

      // Handle LinkedIn's "Sign in" overlay
      try {
        const signInButton = page.locator('text=Sign in');
        if (await signInButton.isVisible({ timeout: 2000 })) {
          // Try to find "Skip for now" or similar
          const skipButton = page.locator('text=Skip for now, text=Continue without signing in, text=Browse jobs');
          if (await skipButton.first().isVisible({ timeout: 2000 })) {
            await skipButton.first().click();
            await this.delay(2000);
          }
        }
      } catch (e) {
        // Continue if no overlay
      }

      // Wait for job cards
      await page.waitForSelector('.base-card, .job-search-card, .jobs-search__results-list li', { timeout: 10000 }).catch(() => {
        logger.warn('LinkedIn job cards not found, trying alternative');
      });

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('.base-card, .job-search-card, .jobs-search__results-list li, .ember-view.jobs-search-results__list-item');
        const jobsData = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('.base-search-card__title, .job-search-card__title, h3 a, .sr-only');
            const companyElement = element.querySelector('.base-search-card__subtitle, .job-search-card__subtitle, h4 a, .hidden-nested-link');
            const locationElement = element.querySelector('.job-search-card__location, .job-result-card__location');
            const linkElement = element.querySelector('a[href*="/jobs/view"], .base-card__full-link');
            const timeElement = element.querySelector('time, .job-search-card__listdate');

            if (titleElement && companyElement) {
              const title = titleElement.textContent?.trim() || '';
              const company = companyElement.textContent?.trim() || '';
              
              if (title && company && title.length > 0 && company.length > 0) {
                jobsData.push({
                  title: title,
                  company: company,
                  location: locationElement?.textContent?.trim() || 'Not specified',
                  salary: 'Not specified',
                  description: '',
                  url: linkElement?.href || '',
                  source: 'linkedin',
                  datePosted: timeElement?.getAttribute('datetime') || new Date().toISOString(),
                  type: 'full-time',
                  featured: element.classList.contains('job-search-card--promoted') || false
                });
              }
            }
          } catch (error) {
            console.error('Error parsing LinkedIn job element:', error);
          }
        });

        return jobsData;
      });

      logger.info(`✅ Found ${jobs.length} jobs on LinkedIn`);
      return jobs;

    } catch (error) {
      logger.error('❌ Error scraping LinkedIn:', error);
      return [];
    } finally {
      await context.close();
    }
  }

  // Enhanced Wellfound Scraper with Playwright
  async scrapeWellfound(searchTerm = 'software engineer', limit = 25) {
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for Wellfound scraping');
      return [];
    }

    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    try {
      const url = `https://wellfound.com/jobs?query=${encodeURIComponent(searchTerm)}&sortBy=recency`;
      logger.info(`🔍 Scraping Wellfound: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.delay(3000);

      // Wait for job cards
      await page.waitForSelector('[data-test="JobCard"], .job-card, .startup-link', { timeout: 10000 }).catch(() => {
        logger.warn('Wellfound job cards not found, trying to scroll');
      });

      // Scroll to load more jobs
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await this.delay(2000);

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('[data-test="JobCard"], .job-card, .startup-link, .job-listing, div[class*="job"]');
        const jobsData = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('[data-test="JobTitle"], .job-title, h2, h3, a[href*="/jobs/"]');
            const companyElement = element.querySelector('[data-test="CompanyName"], .company-name, .startup-name, h4');
            const locationElement = element.querySelector('[data-test="JobLocation"], .location, .job-location');
            const salaryElement = element.querySelector('[data-test="JobSalary"], .salary, .compensation');
            const linkElement = element.querySelector('a[href*="/jobs/"], a[href*="/job/"]');

            if (titleElement && companyElement) {
              const title = titleElement.textContent?.trim() || '';
              const company = companyElement.textContent?.trim() || '';
              
              if (title && company && title.length > 0 && company.length > 0) {
                jobsData.push({
                  title: title,
                  company: company,
                  location: locationElement?.textContent?.trim() || 'Remote',
                  salary: salaryElement?.textContent?.trim() || 'Not specified',
                  description: '',
                  url: linkElement?.href ? (linkElement.href.startsWith('http') ? linkElement.href : `https://wellfound.com${linkElement.href}`) : '',
                  source: 'wellfound',
                  datePosted: new Date().toISOString(),
                  type: 'full-time',
                  featured: element.classList.contains('featured') || false
                });
              }
            }
          } catch (error) {
            console.error('Error parsing Wellfound job element:', error);
          }
        });

        return jobsData;
      });

      logger.info(`✅ Found ${jobs.length} jobs on Wellfound`);
      return jobs;

    } catch (error) {
      logger.error('❌ Error scraping Wellfound:', error);
      return [];
    } finally {
      await context.close();
    }
  }

  // Glassdoor Scraper (Bonus)
  async scrapeGlassdoor(searchTerm = 'software engineer', location = 'remote', limit = 25) {
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for Glassdoor scraping');
      return [];
    }

    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    try {
      const url = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(searchTerm)}&locT=&locId=&jobType=&fromAge=7&minSalary=0&includeNoSalaryJobs=true&radius=0&cityId=-1&minRating=0.0&industryId=-1&sgocId=-1&seniorityType=&companyId=-1&employerSizes=0&applicationType=0&remoteWorkType=0`;
      logger.info(`🔍 Scraping Glassdoor: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.delay(3000);

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('[data-test="job-result"], .job-search-card, .react-job-listing');
        const jobsData = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('[data-test="job-title"], .job-title, h2 a');
            const companyElement = element.querySelector('[data-test="employer-name"], .employer-name, .company');
            const locationElement = element.querySelector('[data-test="job-location"], .location');
            const salaryElement = element.querySelector('[data-test="detailSalary"], .salary');

            if (titleElement && companyElement) {
              const title = titleElement.textContent?.trim() || '';
              const company = companyElement.textContent?.trim() || '';
              
              if (title && company && title.length > 0 && company.length > 0) {
                jobsData.push({
                  title: title,
                  company: company,
                  location: locationElement?.textContent?.trim() || 'Not specified',
                  salary: salaryElement?.textContent?.trim() || 'Not specified',
                  description: '',
                  url: titleElement.href || '',
                  source: 'glassdoor',
                  datePosted: new Date().toISOString(),
                  type: 'full-time'
                });
              }
            }
          } catch (error) {
            console.error('Error parsing Glassdoor job element:', error);
          }
        });

        return jobsData;
      });

      logger.info(`✅ Found ${jobs.length} jobs on Glassdoor`);
      return jobs;

    } catch (error) {
      logger.error('❌ Error scraping Glassdoor:', error);
      return [];
    } finally {
      await context.close();
    }
  }

  // Main crawl function for browser-based sources
  async crawlBrowserJobs(options = {}) {
    const {
      searchTerms = ['software engineer', 'frontend developer'],
      locations = ['remote', 'san francisco'],
      sources = ['indeed', 'linkedin', 'wellfound', 'glassdoor']
    } = options;

    const allJobs = [];
    const results = {
      success: true,
      totalJobs: 0,
      sources: {},
      mode: 'browser'
    };

    try {
      for (const searchTerm of searchTerms) {
        logger.info(`🎯 Crawling browser sources for: ${searchTerm}`);

        if (sources.includes('indeed')) {
          for (const location of locations) {
            const indeedJobs = await this.scrapeIndeed(searchTerm, location, 20);
            allJobs.push(...indeedJobs);
            results.sources.indeed = (results.sources.indeed || 0) + indeedJobs.length;
            await this.delay(3000); // Rate limiting
          }
        }

        if (sources.includes('linkedin')) {
          for (const location of locations) {
            const linkedinJobs = await this.scrapeLinkedIn(searchTerm, location, 15);
            allJobs.push(...linkedinJobs);
            results.sources.linkedin = (results.sources.linkedin || 0) + linkedinJobs.length;
            await this.delay(4000); // More conservative rate limiting for LinkedIn
          }
        }

        if (sources.includes('wellfound')) {
          const wellfoundJobs = await this.scrapeWellfound(searchTerm, 15);
          allJobs.push(...wellfoundJobs);
          results.sources.wellfound = (results.sources.wellfound || 0) + wellfoundJobs.length;
          await this.delay(3000);
        }

        if (sources.includes('glassdoor')) {
          for (const location of locations) {
            const glassdoorJobs = await this.scrapeGlassdoor(searchTerm, location, 15);
            allJobs.push(...glassdoorJobs);
            results.sources.glassdoor = (results.sources.glassdoor || 0) + glassdoorJobs.length;
            await this.delay(3000);
          }
        }

        // Delay between search terms
        await this.delay(2000);
      }

      results.totalJobs = allJobs.length;
      logger.info(`🎉 Browser crawling completed: ${results.totalJobs} jobs found`);

    } catch (error) {
      logger.error('❌ Critical error during browser crawling:', error);
      results.success = false;
      results.error = error.message;
    } finally {
      await this.closeBrowser();
    }

    return { results, jobs: allJobs };
  }

  getStatus() {
    return {
      type: 'browser-based',
      browserRequired: true,
      engine: 'playwright',
      availableSources: ['indeed', 'linkedin', 'wellfound', 'glassdoor'],
      active: !!this.browser
    };
  }
}

export default new PlaywrightCrawlerService();
