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

  // Method aliases for crawler service compatibility
  async crawlLinkedIn(searchTerm, location, limit) {
    return await this.scrapeLinkedIn(searchTerm, location, limit);
  }

  async crawlIndeed(searchTerm, location, limit) {
    return await this.scrapeIndeed(searchTerm, location, limit);
  }

  async crawlRemoteOK(searchTerm, limit) {
    return await this.scrapeWellfound(searchTerm, limit); // Use Wellfound as RemoteOK alternative
  }

  // Specific Mercury job crawler
  async crawlMercury(searchTerm = 'software engineer', limit = 25) {
    logger.info('🔗 Starting Mercury jobs crawl...');
    const browser = await this.initBrowser();
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent(this.getRandomUserAgent());
      
      // Navigate to Mercury careers page
      await page.goto('https://mercury.com/careers', { waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(2000);
      
      // Extract Mercury-specific job data
      const jobs = await page.evaluate(() => {
        const jobsData = [];
        
        // Mercury uses specific job card selectors
        const jobElements = document.querySelectorAll('[data-testid="job-card"], .job-listing, .career-listing, a[href*="/jobs/"]');
        
        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('h3, h2, .job-title, [class*="title"]') || element;
            const locationElement = element.querySelector('.location, [class*="location"]');
            
            const title = titleElement.textContent?.trim() || '';
            const href = element.href || element.querySelector('a')?.href || '';
            
            if (title && href) {
              jobsData.push({
                title: title,
                company: 'Mercury',
                location: locationElement?.textContent?.trim() || 'Remote',
                url: href,
                source: 'mercury'
              });
            }
          } catch (error) {
            console.error('Error parsing Mercury job:', error);
          }
        });
        
        return jobsData;
      });
      
      // Now get detailed info for each job
      const detailedJobs = [];
      for (const job of jobs.slice(0, limit)) {
        try {
          await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 30000 });
          await this.delay(2000);
          
          const jobDetails = await page.evaluate(() => {
            // Extract detailed job information
            const description = document.querySelector('.job-description, [class*="description"], .content, main')?.textContent?.trim() || '';
            
            // Extract salary from text
            const salaryMatch = description.match(/\$(\d{1,3}(?:,\d{3})*)\s*[-–]\s*\$(\d{1,3}(?:,\d{3})*)/);
            let salary = 'Not specified';
            if (salaryMatch) {
              salary = `$${salaryMatch[1]} - $${salaryMatch[2]}`;
            }
            
            // Extract skills from description
            const skillsRegex = /(React|TypeScript|Haskell|JavaScript|Python|Java|Go|Node\.js|SQL|AWS|Docker|Kubernetes|GraphQL|REST|API|Git|Agile|Scrum)/gi;
            const skillsMatches = description.match(skillsRegex) || [];
            const uniqueSkills = [...new Set(skillsMatches.map(skill => skill.toLowerCase()))];
            
            return {
              description: description,
              salary: salary,
              skills: uniqueSkills,
              datePosted: new Date().toISOString(),
              type: 'full-time'
            };
          });
          
          // Combine basic info with detailed info
          detailedJobs.push({
            ...job,
            ...jobDetails
          });
          
        } catch (error) {
          logger.error(`Error getting details for Mercury job ${job.title}:`, error);
          // Add basic job without details
          detailedJobs.push({
            ...job,
            description: 'No detailed description available',
            salary: 'Not specified',
            skills: [],
            datePosted: new Date().toISOString(),
            type: 'full-time'
          });
        }
      }
      
      logger.info(`✅ Found ${detailedJobs.length} Mercury jobs`);
      return detailedJobs;
      
    } catch (error) {
      logger.error('❌ Error crawling Mercury jobs:', error);
      return [];
    }
  }

  async crawlMercury(specificUrl = null) {
    console.log('🏦 Crawling Mercury jobs...');
    
    const browser = await this.initBrowser();
    if (!browser) {
      console.warn('Browser not available for Mercury crawling');
      return [];
    }

    try {
      const page = await browser.newPage();
      await page.setUserAgent(this.getRandomUserAgent());
      
      // Use specific URL if provided, otherwise use general Mercury careers page
      const mercuryUrl = specificUrl || 'https://boards.greenhouse.io/mercury';
      
      console.log(`🔗 Navigating to Mercury: ${mercuryUrl}`);
      await page.goto(mercuryUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await this.delay(3000);

      // If this is a specific job URL, extract full description
      if (specificUrl && specificUrl.includes('/jobs/')) {
        console.log('📄 Extracting full job description from specific Mercury job page');
        
        const jobData = await page.evaluate(() => {
          // Mercury/Greenhouse job description selectors
          const descriptionElement = document.querySelector('#content, .section-wrapper, .job-post-content, .application-detail');
          const description = descriptionElement?.textContent?.trim() || '';
          
          // Extract salary if available
          const salaryElement = document.querySelector('.salary, [class*="salary"], .compensation');
          const salary = salaryElement?.textContent?.trim() || '';
          
          // Get job title from page
          const titleElement = document.querySelector('h1, .job-title, .application-title');
          const title = titleElement?.textContent?.trim() || '';
          
          return {
            title,
            description,
            salary
          };
        });

        await page.close();

        if (jobData.description) {
          return [{
            title: jobData.title || 'Mercury Job',
            company: 'Mercury',
            location: 'Remote/Multiple Locations',
            description: jobData.description,
            salary: jobData.salary || 'Competitive',
            url: specificUrl,
            sourceUrl: specificUrl,
            datePosted: new Date().toISOString()
          }];
        }
      }

      await page.close();
      console.log('✅ Mercury crawling completed');
      return [];

    } catch (error) {
      console.error('❌ Error crawling Mercury jobs:', error);
      return [];
    }
  }

  async crawlUrl(url) {
    // Check if this is a Mercury URL and use specific parser
    if (url.includes('mercury.com') || url.includes('greenhouse.io/mercury')) {
      return this.crawlMercury(url);
    }
    
    // Generic URL crawler for any job site
    const browser = await this.initBrowser();
    if (!browser) {
      logger.warn('Browser not available for URL crawling');
      return [];
    }

    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    try {
      logger.info(`🔍 Crawling URL: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.delay(3000);

      // Generic job extraction logic
      const jobs = await page.evaluate(() => {
        const possibleJobSelectors = [
          '[data-testid*="job"], [data-test*="job"], .job-card, .job-listing, .job-item',
          '.job-search-card, .base-card, .search-result',
          '[class*="job"], [class*="position"], [class*="vacancy"]'
        ];

        const jobsData = [];
        
        for (const selector of possibleJobSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(element => {
              try {
                // Try multiple title selectors
                const titleElement = element.querySelector('h1, h2, h3, .title, [class*="title"], a[href*="job"]');
                const companyElement = element.querySelector('.company, [class*="company"], .employer, [class*="employer"]');
                const locationElement = element.querySelector('.location, [class*="location"], .city, [class*="city"]');
                
                // Enhanced description extraction
                const descriptionElement = element.querySelector('.description, [class*="description"], .content, [class*="content"], .summary, [class*="summary"], p, .text, [class*="text"]');
                
                // Enhanced salary extraction
                const salaryElement = element.querySelector('.salary, [class*="salary"], .compensation, [class*="compensation"], .pay, [class*="pay"]');
                
                if (titleElement) {
                  const title = titleElement.textContent?.trim() || '';
                  const company = companyElement?.textContent?.trim() || 'Unknown Company';
                  
                  // Extract description - try multiple approaches
                  let description = '';
                  if (descriptionElement) {
                    description = descriptionElement.textContent?.trim() || '';
                  }
                  
                  // If no description found in element, try to get from parent or nearby elements
                  if (!description && element.parentElement) {
                    const parentDesc = element.parentElement.querySelector('p, div[class*="desc"], div[class*="detail"]');
                    description = parentDesc?.textContent?.trim() || '';
                  }
                  
                  // Extract salary information
                  let salary = 'Not specified';
                  if (salaryElement) {
                    salary = salaryElement.textContent?.trim() || 'Not specified';
                  } else {
                    // Look for salary patterns in text
                    const salaryMatch = (description || title).match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?|\$[\d,]+k?(?:\s*-\s*\$[\d,]+k?)?/i);
                    if (salaryMatch) {
                      salary = salaryMatch[0];
                    }
                  }
                  
                  if (title && title.length > 0) {
                    jobsData.push({
                      title: title,
                      company: company,
                      location: locationElement?.textContent?.trim() || 'Not specified',
                      salary: salary,
                      description: description || 'No detailed description available',
                      url: window.location.href,
                      source: 'crawled',
                      datePosted: new Date().toISOString(),
                      type: 'full-time'
                    });
                  }
                }
              } catch (error) {
                console.error('Error parsing job element:', error);
              }
            });
            
            if (jobsData.length > 0) {
              break; // Found jobs with this selector, stop trying others
            }
          }
        }

        return jobsData;
      });

      logger.info(`✅ Found ${jobs.length} jobs from URL crawl`);
      return jobs;

    } catch (error) {
      logger.error('❌ Error crawling URL:', error);
      return [];
    } finally {
      await context.close();
    }
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
